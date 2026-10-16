import { z } from 'zod';

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

/** Input to a provider's `startResearch`. */
export const startResearchParamsSchema = z.object({
  prompt: z.string(),
  model: researchModelSchema,
  /** JSON Schema for the structured digest. When set, `content` comes back as an object matching it. */
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

/** A provider's acknowledgment of a submitted request. Also validates the raw start response. */
export const startResearchResultSchema = z.object({
  requestId: z.string().min(1),
});

/** Raw provider poll response — validated loosely at the boundary before normalizing. */
export const researchPollResponseSchema = z.object({
  status: researchStatusSchema,
  content: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(researchSourceSchema).optional(),
  request_id: z.string().min(1),
  response_time: z.number(),
  error: z.string().nullish(),
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
  }),
  z.object({ status: z.literal('failed'), reason: z.string() }),
]);

/**
 * Structured output of the research-prompt builder. Its `composeResearchPrompt`
 * rendering becomes the string sent to the provider (`project_research.prompt`).
 * Sections map to the provider's prompting guidance: a clear task statement,
 * what the user already knows, explicit scope, and the desired output shape.
 */
export const researchPromptSchema = z.object({
  /** A clear, directional task statement — what to research. */
  objective: z.string().min(20).max(300),
  /** Prior knowledge, assumptions, and decisions already made, so research doesn't repeat them. */
  known: z.string().max(600).default(''),
  /** Explicit in/out boundaries; state that it's exploratory when the user wants discovery. */
  scope: z.string().min(10).max(400),
  /** The desired structure/format of the returned findings. */
  outputFormat: z.string().min(20).max(400),
});
