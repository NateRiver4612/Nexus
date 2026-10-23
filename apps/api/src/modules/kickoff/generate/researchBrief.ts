import type { CompletionUsage } from 'openai/resources/completions.mjs';
import type { ResearchBriefType } from '@nexus/types';
import { researchBriefSchema } from '@nexus/zod-schemas';

import { env } from '../../../env';
import {
  buildResearchBriefSystemPrompt,
  buildResearchBriefUserPrompt,
  buildResearchOutputRules,
  type ResearchBriefContext,
} from '../prompts';
import {
  attemptToolCallWithRetry,
  type AttemptToolCallFailure,
  type ChatMessage,
} from './toolCall';

export const RESEARCH_BRIEF_TOOL_NAME = 'build_research_brief';

/** Cheap, well-bounded output — a small flash budget suffices. */
export const BRIEF_MAX_TOKENS = 2000;
export const BRIEF_MAX_TOKENS_RETRY = 3000;

export type ResearchBriefResult = { brief: string; usage?: CompletionUsage };

function buildResearchBriefCorrection({
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
 * Builds the research brief (the string later sent to the research provider via
 * `project_research.brief`). The flash model writes only the project-specific
 * objective/known/scope; the recency + citation rules are appended deterministically by
 * `composeResearchBrief`. The output shape is supplied separately as the provider's
 * `output_schema`, not in this brief.
 */
export async function buildResearchBrief({
  stepData,
  today,
  reason,
  sourceLimit,
}: ResearchBriefContext & { sourceLimit: number }): Promise<ResearchBriefResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildResearchBriefSystemPrompt() },
    { role: 'user', content: buildResearchBriefUserPrompt({ stepData, today, reason }) },
  ];

  const { data, usage } = await attemptToolCallWithRetry({
    messages,
    toolName: RESEARCH_BRIEF_TOOL_NAME,
    toolParamsSchema: researchBriefSchema,
    validateSchema: researchBriefSchema,
    maxTokens: BRIEF_MAX_TOKENS,
    maxTokensRetry: BRIEF_MAX_TOKENS_RETRY,
    model: env.AI_RESEARCH_MODEL,
    label: 'research brief generation',
    buildCorrection: buildResearchBriefCorrection,
  });

  return { brief: composeResearchBrief(data, { today, sourceLimit }), usage };
}

/**
 * Renders the validated sections plus the fixed tail into the string actually sent to
 * the provider: task statement + context + citation rules. The desired output shape is
 * passed to the provider as `output_schema`, not described here.
 */
export function composeResearchBrief(
  brief: ResearchBriefType,
  { today, sourceLimit }: { today: string; sourceLimit: number },
): string {
  const sections = [
    `Objective: ${brief.objective}`,
    brief.known.trim() ? `What we already know: ${brief.known.trim()}` : '',
    `Scope: ${brief.scope}`,
    buildResearchOutputRules({ today, sourceLimit }),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}
