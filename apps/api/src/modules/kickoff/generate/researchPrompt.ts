import type { CompletionUsage } from 'openai/resources/completions.mjs';
import type { ResearchPromptType } from '@nexus/types';
import { researchPromptSchema } from '@nexus/zod-schemas';

import { env } from '../../../env';
import {
  buildResearchPromptSystemPrompt,
  buildResearchPromptUserPrompt,
  type ResearchPromptContext,
} from '../prompts';
import {
  attemptToolCallWithRetry,
  type AttemptToolCallFailure,
  type ChatMessage,
} from './toolCall';

export const RESEARCH_PROMPT_TOOL_NAME = 'build_research_prompt';

/** Cheap, well-bounded output — a small flash budget suffices. */
export const PROMPT_MAX_TOKENS = 2000;
export const PROMPT_MAX_TOKENS_RETRY = 3000;

export type ResearchPromptResult = { prompt: string; usage?: CompletionUsage };

function buildResearchPromptCorrection({
  issues = [],
  missingKeys = [],
}: AttemptToolCallFailure): string | null {
  if (issues.length > 0) {
    return (
      `Your previous response failed validation. Fix exactly these issues and re-output the FULL object ` +
      `(objective, known, scope, outputFormat), respecting each field's length limit:\n` +
      issues.map((issue) => `- ${issue}`).join('\n')
    );
  }

  if (missingKeys.length > 0) {
    return (
      `Your previous response was incomplete: it was missing required field(s): ${missingKeys.join(', ')}. ` +
      `Re-output the FULL object with every field populated.`
    );
  }

  return null;
}

/**
 * Builds the research prompt (the string later sent to the research provider via
 * `project_research.prompt`). One forced tool-calling request on the cheaper research
 * model, with a single corrective retry — mirrors the kickoff summary stage.
 * Deliberately uses only goal-level data: see `buildResearchPromptUserPrompt`.
 */
export async function buildResearchPrompt(
  context: ResearchPromptContext,
): Promise<ResearchPromptResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildResearchPromptSystemPrompt() },
    { role: 'user', content: buildResearchPromptUserPrompt(context) },
  ];

  const { data, usage } = await attemptToolCallWithRetry({
    messages,
    toolName: RESEARCH_PROMPT_TOOL_NAME,
    toolParamsSchema: researchPromptSchema,
    validateSchema: researchPromptSchema,
    maxTokens: PROMPT_MAX_TOKENS,
    maxTokensRetry: PROMPT_MAX_TOKENS_RETRY,
    model: env.AI_RESEARCH_MODEL,
    label: 'research prompt generation',
    buildCorrection: buildResearchPromptCorrection,
  });

  return { prompt: composeResearchPrompt(data), usage };
}

/**
 * Renders the validated prompt object into the string actually sent to the provider —
 * a clean task statement + essential context + desired output format.
 */
export function composeResearchPrompt(prompt: ResearchPromptType): string {
  const sections = [
    `Objective: ${prompt.objective}`,
    prompt.known.trim() ? `What we already know: ${prompt.known.trim()}` : null,
    `Scope: ${prompt.scope}`,
    `Desired output: ${prompt.outputFormat}`,
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}
