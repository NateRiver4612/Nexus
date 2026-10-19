import type { CompletionUsage } from 'openai/resources/completions.mjs';
import type { ResearchPromptType } from '@nexus/types';
import { researchPromptSchema } from '@nexus/zod-schemas';

import { env } from '../../../env';
import {
  buildResearchOutputRules,
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
      `(objective, known, scope), respecting each field's length limit:\n` +
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
 * `project_research.prompt`). The flash model writes only the project-specific
 * objective/known/scope; the recency + citation rules are appended deterministically by
 * `composeResearchPrompt`. The output shape is supplied separately as the provider's
 * `output_schema`, not in this prompt.
 */
export async function buildResearchPrompt({
  stepData,
  today,
}: ResearchPromptContext): Promise<ResearchPromptResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildResearchPromptSystemPrompt() },
    { role: 'user', content: buildResearchPromptUserPrompt({ stepData, today }) },
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

  return { prompt: composeResearchPrompt(data, { today }), usage };
}

/**
 * Renders the validated sections plus the fixed tail into the string actually sent to
 * the provider: task statement + context + citation rules. The desired output shape is
 * passed to the provider as `output_schema`, not described here.
 */
export function composeResearchPrompt(
  prompt: ResearchPromptType,
  { today }: { today: string },
): string {
  const sections = [
    `Objective: ${prompt.objective}`,
    prompt.known.trim() ? `What we already know: ${prompt.known.trim()}` : '',
    `Scope: ${prompt.scope}`,
    buildResearchOutputRules({ today }),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}
