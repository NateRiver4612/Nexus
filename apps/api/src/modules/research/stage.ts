import type { CompletionUsage } from 'openai/resources/completions.mjs';

import type { Db, ProjectResearch } from '@nexus/db';
import type {
  OnboardingDataType,
  ResearchDigestType,
  ResearchModelType,
  ResearchOutputLengthType,
  ResearchProviderType,
  ResearchSourceType,
} from '@nexus/types';
import {
  RESEARCH_DIGEST_OUTPUT_SCHEMA,
  researchDigestSchema,
  researchModelSchema,
} from '@nexus/zod-schemas';

import { env } from '../../env';
import { buildResearchBrief } from '../kickoff/generate/researchBrief';
import { ResearchRepository } from './repository';

const POLL_INTERVAL_MS = 5_000;
/** How long a user may wait for research before it is abandoned. */
const RESEARCH_TIMEOUT_MS = 4 * 60 * 1000;
/** Consecutive poll errors tolerated before giving up. */
const MAX_TRANSIENT_FAILURES = 3;
/** Hard cap on sources kept per research run (also the default). */
const MAX_SOURCES = 20;

export type ResearchResult = {
  digest: ResearchDigestType;
  sources: ResearchSourceType[];
};

export type ResearchOutcome = {
  /** Null when research was skipped or failed — the plan is generated without it. */
  result: ResearchResult | null;
  /** The research-brief builder's flash usage. Undefined when a resumed row skipped the call. */
  usage?: CompletionUsage;
};

type RunResearchParams = {
  db: Db;
  provider: ResearchProviderType;
  projectId: string;
  /** The aiRuns id. A resubmit gets a new one; a BullMQ retry keeps it, which is what makes resume work. */
  runId: string;
  stepData: OnboardingDataType;
  /** YYYY-MM-DD, passed through to the research brief. */
  today: string;
  /** Optional user reason for (re)generation, fed into the research brief. */
  reason?: string;
  /** Tavily research depth. Defaults to 'pro' (kickoff); on-command uses 'mini'. */
  model?: ResearchModelType;
  /** Target report size. On-command uses 'short'; omitted uses the provider default (standard). */
  outputLength?: ResearchOutputLengthType;
  /** Max sources to keep (1–20). Defaults to MAX_SOURCES. */
  sourceLimit?: number;
};

type ResearchRepo = ReturnType<typeof ResearchRepository>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Runs a research task: build the brief, submit it, persist the request id, poll until
 * done, validate and save the digest.
 *
 * Never throws: any failure is recorded on the row and the outcome carries `result: null`,
 * so callers (kickoff, on-command) can continue without research.
 *
 * Resume: rows are keyed by run id. If this run already has a row, a retry picks up where
 * the previous attempt stopped (completed -> reuse, failed -> skip, in progress -> keep polling)
 * instead of submitting and paying for a second request.
 */
export async function runResearch({
  db,
  provider,
  projectId,
  runId,
  stepData,
  today,
  reason,
  model = 'pro',
  outputLength,
  sourceLimit = MAX_SOURCES,
}: RunResearchParams): Promise<ResearchOutcome> {
  // No key configured: research is simply off.
  if (!env.TAVILY_API_KEY) return { result: null };

  const researchRepository = ResearchRepository(db);
  let rowId: string | null = null;
  let usage: CompletionUsage | undefined;

  try {
    const existing = await researchRepository.getByAiRunId(runId);

    if (existing?.status === 'completed') return { result: readCompleted(existing) };
    if (existing?.status === 'failed') return { result: null };

    let row = existing;

    if (!row) {
      const created = await createRow({
        researchRepository,
        provider,
        projectId,
        runId,
        stepData,
        today,
        reason,
        model,
        sourceLimit,
      });
      row = created.row;
      usage = created.usage;
    }

    rowId = row.id;

    // Already submitted by an earlier attempt: skip straight to polling.
    if (row.requestId) {
      const startedAt = row.startedAt ?? new Date();
      return {
        result: await poll({
          researchRepository,
          provider,
          rowId: row.id,
          requestId: row.requestId,
          startedAt,
          sourceLimit,
        }),
        usage,
      };
    }

    const startedAt = new Date();
    const requestId = await submit({ researchRepository, provider }, row, startedAt, outputLength);

    return {
      result: await poll({
        researchRepository,
        provider,
        rowId: row.id,
        requestId,
        startedAt,
        sourceLimit,
      }),
      usage,
    };
  } catch (error) {
    console.error(`[research] run ${runId} failed, continuing without research:`, error);

    if (rowId) {
      await researchRepository
        .markFailed({ id: rowId, errorMessage: errorText(error) })
        .catch((markError) => console.error('[research] could not record the failure:', markError));
    }

    return { result: null, usage };
  }
}

/** Builds the brief (one flash call) and inserts the row as `pending`. */
async function createRow({
  researchRepository,
  provider,
  projectId,
  runId,
  stepData,
  today,
  reason,
  model,
  sourceLimit,
}: {
  researchRepository: ResearchRepo;
  provider: ResearchProviderType;
  projectId: string;
  runId: string;
  stepData: OnboardingDataType;
  today: string;
  reason?: string;
  model: ResearchModelType;
  sourceLimit: number;
}): Promise<{ row: ProjectResearch; usage?: CompletionUsage }> {
  const { brief, usage } = await buildResearchBrief({ stepData, today, reason, sourceLimit });

  const row = await researchRepository.create({
    projectId,
    aiRunId: runId,
    provider: provider.name,
    model,
    brief,
  });

  if (!row) throw new Error('Failed to insert project_research row');

  return { row, usage };
}

/**
 * Submits the request and saves its id immediately, before any polling. That write is what
 * lets a restarted worker resume instead of submitting (and paying for) a second request.
 */
async function submit(
  {
    researchRepository,
    provider,
  }: { researchRepository: ResearchRepo; provider: ResearchProviderType },
  row: ProjectResearch,
  startedAt: Date,
  outputLength?: ResearchOutputLengthType,
): Promise<string> {
  const { requestId } = await provider.startResearch({
    brief: row.brief,
    model: researchModelSchema.parse(row.model),
    outputLength,
    outputSchema: RESEARCH_DIGEST_OUTPUT_SCHEMA,
  });

  await researchRepository.markSubmitted({ id: row.id, requestId, startedAt });

  return requestId;
}

async function poll({
  researchRepository,
  provider,
  rowId,
  requestId,
  startedAt,
  sourceLimit,
}: {
  researchRepository: ResearchRepo;
  provider: ResearchProviderType;
  rowId: string;
  requestId: string;
  startedAt: Date;
  sourceLimit: number;
}): Promise<ResearchResult | null> {
  // Measured from when the request was submitted, so a resumed attempt does not restart the clock.
  const deadline = startedAt.getTime() + RESEARCH_TIMEOUT_MS;
  let transientFailures = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let result;
    try {
      result = await provider.getResearch({ requestId });
      transientFailures = 0;
    } catch (error) {
      // Polling is cheap and never re-submits, so a short run of any errors is worth retrying.
      if (++transientFailures >= MAX_TRANSIENT_FAILURES) throw error;
      continue;
    }

    if (result.status === 'failed') {
      await researchRepository.markFailed({ id: rowId, errorMessage: result.reason });
      return null;
    }

    if (result.status !== 'completed') continue; // pending / in_progress

    // `content` is untrusted: validate before it reaches the jsonb column or a brief.
    const parsed = researchDigestSchema.safeParse(result.content);

    if (!parsed.success) {
      await researchRepository.markFailed({
        id: rowId,
        errorMessage: `Digest failed validation: ${parsed.error.message}`,
      });
      return null;
    }

    // Keep only the top `sourceLimit` sources — the rest are noise for a digest view.
    const sources = result.sources.slice(0, sourceLimit);

    await researchRepository.markCompleted({
      id: rowId,
      content: parsed.data,
      sources,
      creditsUsed: result.creditsUsed,
      responseTime: result.responseTime,
    });

    return { digest: parsed.data, sources };
  }

  await researchRepository.markFailed({ id: rowId, errorMessage: 'Research timed out' });
  return null;
}

/** Re-validates a saved row on the way out, as the column comment asks. */
function readCompleted(row: ProjectResearch): ResearchResult | null {
  const parsed = researchDigestSchema.safeParse(row.content);
  if (!parsed.success) return null;

  return { digest: parsed.data, sources: row.sources ?? [] };
}
