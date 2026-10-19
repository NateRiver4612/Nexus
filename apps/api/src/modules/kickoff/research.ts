import type { CompletionUsage } from 'openai/resources/completions.mjs';

import type { Db, ProjectResearch } from '@nexus/db';
import type {
  OnboardingDataType,
  ResearchDigestType,
  ResearchModelType,
  ResearchProviderType,
  ResearchSourceType,
} from '@nexus/types';
import {
  RESEARCH_DIGEST_OUTPUT_SCHEMA,
  researchDigestSchema,
  researchModelSchema,
} from '@nexus/zod-schemas';

import { env } from '../../env';
import { ResearchRepository } from '../ai/repository';
import { buildResearchPrompt } from './generate/researchPrompt';

/** Tavily research depth. 'mini' is the cheaper, faster option. */
const RESEARCH_MODEL = 'pro' as ResearchModelType;

const POLL_INTERVAL_MS = 5_000;
/** How long a user may wait for research before the plan is generated without it. */
const RESEARCH_TIMEOUT_MS = 4 * 60 * 1000;
/** Consecutive poll errors tolerated before giving up. */
const MAX_TRANSIENT_FAILURES = 3;

export type ResearchStageResult = {
  digest: ResearchDigestType;
  sources: ResearchSourceType[];
};

export type ResearchStageOutcome = {
  /** Null when research was skipped or failed — the plan is generated without it. */
  result: ResearchStageResult | null;
  /** The research-prompt builder's flash usage. Undefined when a resumed row skipped the call. */
  usage?: CompletionUsage;
};

type RunResearchStageParams = {
  db: Db;
  provider: ResearchProviderType;
  projectId: string;
  /** The aiRuns id. A resubmit gets a new one; a BullMQ retry keeps it, which is what makes resume work. */
  runId: string;
  stepData: OnboardingDataType;
  /** YYYY-MM-DD, passed through to the research prompt. */
  today: string;
};

type ResearchRepo = ReturnType<typeof ResearchRepository>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The research stage of kickoff: build the prompt, submit it, persist the request id,
 * poll until done, validate and save the digest.
 *
 * Never throws and never blocks the plan: any failure is recorded on the row and the
 * outcome carries `result: null`, so the plan is generated without research.
 *
 * Resume: rows are keyed by run id. If this run already has a row, a retry picks up where
 * the previous attempt stopped (completed -> reuse, failed -> skip, in progress -> keep polling)
 * instead of submitting and paying for a second request.
 */
export async function runResearchStage({
  db,
  provider,
  projectId,
  runId,
  stepData,
  today,
}: RunResearchStageParams): Promise<ResearchStageOutcome> {
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
        }),
        usage,
      };
    }

    const startedAt = new Date();
    const requestId = await submit({ researchRepository, provider }, row, startedAt);

    return {
      result: await poll({ researchRepository, provider, rowId: row.id, requestId, startedAt }),
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

/** Builds the prompt (one flash call) and inserts the row as `pending`. */
async function createRow({
  researchRepository,
  provider,
  projectId,
  runId,
  stepData,
  today,
}: {
  researchRepository: ResearchRepo;
  provider: ResearchProviderType;
  projectId: string;
  runId: string;
  stepData: OnboardingDataType;
  today: string;
}): Promise<{ row: ProjectResearch; usage?: CompletionUsage }> {
  const { prompt, usage } = await buildResearchPrompt({ stepData, today });

  const row = await researchRepository.create({
    projectId,
    aiRunId: runId,
    provider: provider.name,
    model: RESEARCH_MODEL,
    prompt,
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
): Promise<string> {
  const { requestId } = await provider.startResearch({
    prompt: row.prompt,
    model: researchModelSchema.parse(row.model),
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
}: {
  researchRepository: ResearchRepo;
  provider: ResearchProviderType;
  rowId: string;
  requestId: string;
  startedAt: Date;
}): Promise<ResearchStageResult | null> {
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

    // `content` is untrusted: validate before it reaches the jsonb column or a prompt.
    const parsed = researchDigestSchema.safeParse(result.content);

    if (!parsed.success) {
      await researchRepository.markFailed({
        id: rowId,
        errorMessage: `Digest failed validation: ${parsed.error.message}`,
      });
      return null;
    }

    await researchRepository.markCompleted({
      id: rowId,
      content: parsed.data,
      sources: result.sources,
      creditsUsed: result.creditsUsed,
      responseTime: result.responseTime,
    });

    return { digest: parsed.data, sources: result.sources };
  }

  await researchRepository.markFailed({ id: rowId, errorMessage: 'Research timed out' });
  return null;
}

/** Re-validates a saved row on the way out, as the column comment asks. */
function readCompleted(row: ProjectResearch): ResearchStageResult | null {
  const parsed = researchDigestSchema.safeParse(row.content);
  if (!parsed.success) return null;

  return { digest: parsed.data, sources: row.sources ?? [] };
}
