import type { CompletionUsage } from 'openai/resources/completions.mjs';

import { eq } from 'drizzle-orm';

import { aiRuns, type Db, type ProjectResearch } from '@nexus/db';
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
import { isRetryableResearchError } from './retry';

const POLL_INTERVAL_MS = 5_000;
/** How long a user may wait for research before it is abandoned. */
const RESEARCH_TIMEOUT_MS = 4 * 60 * 1000;
/** Consecutive poll errors tolerated before giving up. */
const MAX_TRANSIENT_FAILURES = 3;
/** Whole-run budget for transient provider failures; each attempt resumes the same row. */
const RESEARCH_MAX_ATTEMPTS = 3;
/** Base backoff between whole-run retries, doubled per attempt. */
const RETRY_BASE_DELAY_MS = 2_000;
/** Hard cap on sources kept per research run (also the default). */
const MAX_SOURCES = 20;

export type ResearchResult = {
  digest: ResearchDigestType;
  sources: ResearchSourceType[];
};

export type ResearchOutcome = {
  /** Null when research was skipped or failed — the plan is generated without it. */
  result: ResearchResult | null;
  /** The research-brief builder's usage, carried over from the saved row when this attempt resumed one. */
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

/** 2s, 4s… plus jitter so simultaneous runs don't retry in lockstep. */
const retryDelayMs = ({ attempt }: { attempt: number }) =>
  RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Rebuilds the brief-builder usage saved on a research row, when it was recorded. */
function usageFromRow(row: ProjectResearch): CompletionUsage | undefined {
  if (!row.inputTokens && !row.outputTokens) return undefined;

  return {
    prompt_tokens: row.inputTokens,
    completion_tokens: row.outputTokens,
    total_tokens: row.inputTokens + row.outputTokens,
  };
}

/**
 * Runs a research task: build the brief, submit it, persist the request id, poll until
 * done, validate and save the digest.
 *
 * Transient provider failures are retried in place (`RESEARCH_MAX_ATTEMPTS`) before giving up.
 * Never throws: any final failure is recorded on the row and the outcome carries `result: null`,
 * so callers (kickoff, on-command) can continue without research.
 *
 * Resume: rows are keyed by run id. If this run already has a row, an attempt picks up where
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

  /**
   * Retries live here, not on the BullMQ job, because:
   * - `runResearch` is one stage inside the kickoff job. A queue retry would replay the whole
   *   kickoff (knowledge context + plan generation), re-paying for LLM work that already succeeded.
   * - The `project_research` row is keyed by run id, so an in-place attempt resumes: it re-polls
   *   the existing Tavily request or re-submits the stored brief instead of opening a new paid task.
   * - We control which failures are retryable, so an ambiguous submit timeout is never retried
   *   (a generic queue retry would treat it as any other failure).
   * - The failure is persisted only after the final attempt, so the run never flickers through
   *   `failed` between retries and stays in the `researching` stage.
   * - Kickoff and on-demand runs get identical semantics from one implementation.
   *
   * Backoff is deliberately small (2s, 4s + jitter); the 4-minute research deadline still
   * bounds how long polling can continue. `stage` cycles `retrying` (during backoff) ->
   * `researching` (once the next attempt actually starts), so the UI never misreports a run
   * as retrying for the whole attempt.
   */
  for (let attempt = 1; ; attempt++) {
    if (attempt > 1) {
      await db
        .update(aiRuns)
        .set({ stage: 'researching', stageUpdatedAt: new Date(), updatedAt: new Date() })
        .where(eq(aiRuns.id, runId))
        .catch((stageError) => console.warn('[research] could not reset stage:', stageError));
    }

    try {
      const existing = await researchRepository.getByAiRunId(runId);

      // A resumed row already paid for the brief, so reuse its usage instead of dropping it.
      if (existing) usage = usageFromRow(existing);

      if (existing?.status === 'completed') return { result: readCompleted(existing), usage };
      if (existing?.status === 'failed') return { result: null, usage };

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
      const requestId = await submit(
        { researchRepository, provider },
        row,
        startedAt,
        outputLength,
      );

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
      if (isRetryableResearchError({ error }) && attempt < RESEARCH_MAX_ATTEMPTS) {
        console.warn(
          `[research] run ${runId} transient failure (attempt ${attempt}/${RESEARCH_MAX_ATTEMPTS}), retrying:`,
          error,
        );

        // Surface the retry in the UI instead of leaving the run on its previous stage.
        await db
          .update(aiRuns)
          .set({ stage: 'retrying', stageUpdatedAt: new Date(), updatedAt: new Date() })
          .where(eq(aiRuns.id, runId))
          .catch((stageError) => console.warn('[research] could not mark retrying:', stageError));

        // Backoff before retrying, so multiple simultaneous runs don't hammer the provider in lockstep.
        await sleep(retryDelayMs({ attempt }));
        continue;
      }

      console.error(`[research] run ${runId} failed, continuing without research:`, error);

      if (rowId) {
        await researchRepository
          .markFailed({ id: rowId, errorMessage: errorText(error) })
          .catch((markError) =>
            console.error('[research] could not record the failure:', markError),
          );
      }

      return { result: null, usage };
    }
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
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
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
      // Polling never re-submits, so transient errors are cheap to retry. Hopeless errors
      // (config, bad request, unknown request id) fail immediately instead of burning the budget.
      if (!isRetryableResearchError({ error }) || ++transientFailures >= MAX_TRANSIENT_FAILURES) {
        throw error;
      }
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
