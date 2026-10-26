import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';

/** Tavily research depth. Mirrors `project_research.model` ('mini' | 'pro'). */
export const researchModelSchema = z.enum(['mini', 'pro']);

/** Status values for a research run. Kept in sync by hand with the `research_status` pgEnum. */
export const researchStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

/** One web source returned by a research provider. Matches `project_research.sources`. */
export const researchSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  favicon: z.string(),
});

/** Tavily research output size. Mirrors the `/research` `output_length` param. */
export const researchOutputLengthSchema = z.enum(['short', 'standard', 'long']);

/** Input to a provider's `startResearch`. */
export const startResearchParamsSchema = z.object({
  brief: z.string(),
  model: researchModelSchema,
  /** Target output size for the research report. */
  outputLength: researchOutputLengthSchema.optional(),
  /** JSON Schema for the structured digest. When set, `content` comes back as an object matching it. */
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

/** A provider's acknowledgment of a submitted request. Also validates the raw start response. */
export const startResearchResultSchema = z.object({
  requestId: z.string().min(1),
});

/** Raw provider poll response — validated loosely at the boundary before normalizing. */
export const researchPollResponseSchema = z.object({
  // Tavily returns aliases like "queued"/"running" — the provider normalizes them after
  // this loose parse, so the raw status stays a plain string on purpose.
  status: z.string(),
  // With `output_schema` Tavily returns an object, but it can also send a JSON string.
  content: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  sources: z.array(researchSourceSchema).optional(),
  request_id: z.string().min(1),
  response_time: z.number(),
  error: z.string().nullish(),
  // Present because `getResearch` is called with `includeUsage: true`.
  usage: z.object({ credits: z.number().optional() }).optional(),
});

/** Normalized poll result a provider returns to callers. */
export const researchPollSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('in_progress') }),
  z.object({
    status: z.literal('completed'),
    /** Untrusted: validate with the Zod digest schema before saving to the jsonb column. */
    content: z.record(z.string(), z.unknown()).optional(),
    sources: z.array(researchSourceSchema),
    /** Seconds, rounded, ready for `responseTime`. */
    responseTime: z.number().nullable(),
    /** Provider credits this run cost; null when the provider omits usage. */
    creditsUsed: z.number().nullable(),
  }),
  z.object({ status: z.literal('failed'), reason: z.string() }),
]);

/**
 * Structured digest the research provider returns when `RESEARCH_DIGEST_OUTPUT_SCHEMA` is
 * passed as `output_schema`. The field descriptions double as the provider's structural
 * guidance, so there is no separate prose "what I need" list to keep in sync.
 *
 * Deliberately permissive about array lengths: the "up to N" counts are guidance for the
 * provider, not a validation gate that would throw away an otherwise-good digest.
 */
export const researchDigestSchema = z.object({
  landscape: z
    .string()
    .describe(
      'Where the field stands today: the standard tools, approaches, and conventions (a short paragraph).',
    ),
  bestPractices: z
    .array(z.string())
    .describe(
      'The current best practices, in the order they should be applied (up to 8, one sentence each).',
    ),
  pitfalls: z
    .array(z.string())
    .describe('Common mistakes and outdated approaches to avoid (up to 6, one sentence each).'),
  recentChanges: z
    .array(z.string())
    .describe(
      'Things that changed recently that older tutorials get wrong (up to 6, one sentence each).',
    ),
});

/**
 * Tavily's `output_schema` accepts a JSON Schema's `properties` (plus optional `required`)
 * and returns `content` matching it. Derived from `researchDigestSchema` so the schema sent
 * to the provider and the Zod gate that validates the result can never drift apart.
 */
export const RESEARCH_DIGEST_OUTPUT_SCHEMA: Record<string, unknown> = (() => {
  const { properties, required } = z.toJSONSchema(researchDigestSchema);
  return { properties, required };
})();

/**
 * Structured output of the research-brief builder. Its `composeResearchBrief`
 * rendering becomes the string sent to the provider (`project_research.brief`).
 * These are the project-specific sections only — the desired output format and
 * citation rules are appended deterministically by the composer.
 */
export const researchBriefSchema = z.object({
  /** A clear, directional task statement — what to research. */
  objective: z.string().min(20).max(300),
  /** Prior knowledge, assumptions, and decisions already made, so research doesn't repeat them. */
  known: z.string().max(600).default(''),
  /** Explicit in/out boundaries; state that it's exploratory when the user wants discovery. */
  scope: z.string().min(10).max(600),
});

/**
 * A project's research row as exposed by the read API. Provider internals
 * (`brief`, `requestId`) stay server-side; `digest` is re-validated on read.
 */
export const projectResearchSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    aiRunId: idSchema.nullable(),
    status: researchStatusSchema,
    provider: z.string(),
    model: z.string(),
    digest: researchDigestSchema.nullable(),
    sources: z.array(researchSourceSchema),
    creditsUsed: z.number().int().nullable(),
    responseTime: z.number().int().nullable(),
    errorMessage: z.string().nullable(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    ...timestampSchema,
  })
  .openapi('ProjectResearch');

/** Research is optional, so the endpoint returns null when no row exists. */
export const projectResearchResponseSchema = projectResearchSchema
  .nullable()
  .openapi('ProjectResearchResponse');

/** Every completed research run for a project, oldest first (one entry per version). */
export const projectResearchListSchema = z.array(projectResearchSchema).openapi('ProjectResearchList');

/** Body for starting an on-demand research run. `reason` is fed into the research brief. */
export const startProjectResearchInputSchema = z
  .object({
    reason: z
      .string()
      .max(1000)
      .optional()
      .openapi({ example: 'The initial research missed competitor pricing.' }),
    sourceLimit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .openapi({ example: 10, description: 'Max sources to keep (1–20). Defaults to 20.' }),
  })
  .openapi('StartProjectResearchInput');

/** A research run reference — the aiRun id the client polls. */
export const projectResearchRunSchema = z
  .object({
    runId: idSchema,
  })
  .openapi('ProjectResearchRun');

/** Research may or may not be running, so the active endpoint returns null when idle. */
export const projectResearchRunResponseSchema = projectResearchRunSchema
  .nullable()
  .openapi('ProjectResearchRunResponse');
