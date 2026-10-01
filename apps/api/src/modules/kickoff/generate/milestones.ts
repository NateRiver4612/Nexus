import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { kickoffMilestonesSchema } from '@nexus/zod-schemas';
import {
  buildMilestonesSystemPrompt,
  buildMilestonesUserPrompt,
  type KickoffContext,
} from '../prompts';
import { attemptToolCall, type ChatMessage } from './toolCall';

export const MILESTONES_TOOL_NAME = 'generate_project_milestones';

/**
 * Milestones are the big, structurally-hard payload — give them the largest
 * budget and the escalated retry.
 */
export const MILESTONES_MAX_TOKENS = 24000;
export const MILESTONES_MAX_TOKENS_RETRY = 32000;

export type MilestonesResult = {
  milestones: KickoffPlanType['milestones'];
  usage?: CompletionUsage;
};

export async function generateMilestones(context: KickoffContext): Promise<MilestonesResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildMilestonesSystemPrompt(context.stepData) },
    { role: 'user', content: buildMilestonesUserPrompt(context) },
  ];

  const first = await attemptToolCall({
    messages,
    toolName: MILESTONES_TOOL_NAME,
    toolParamsSchema: kickoffMilestonesSchema,
    validateSchema: kickoffMilestonesSchema,
    maxTokens: MILESTONES_MAX_TOKENS,
  });
  if (first.ok) {
    return { milestones: first.data.milestones, usage: first.usage };
  }

  const missingKeys = first.missingKeys ?? [];
  if (first.finishReason === 'length' || missingKeys.length > 0) {
    const reason =
      first.finishReason === 'length'
        ? 'truncated (finish_reason: length)'
        : `missing required fields: ${missingKeys.join(', ')}`;
    console.error(
      `[kickoff] milestones first attempt ${reason} — retrying with ${MILESTONES_MAX_TOKENS_RETRY} tokens.`,
    );

    const correction =
      missingKeys.length > 0
        ? `Your previous response was incomplete: it was missing required field(s): ` +
          `${missingKeys.join(', ')}. Re-generate the FULL "milestones" array — every milestone's ` +
          `tasks fully populated with "steps", "dods" and "estimatedTimeMinutes". Never omit any ` +
          `required field.`
        : undefined;

    const retry = await attemptToolCall({
      messages: [
        ...messages,
        ...(correction ? [{ role: 'user' as const, content: correction }] : []),
      ],
      toolName: MILESTONES_TOOL_NAME,
      toolParamsSchema: kickoffMilestonesSchema,
      validateSchema: kickoffMilestonesSchema,
      maxTokens: MILESTONES_MAX_TOKENS_RETRY,
    });
    if (retry.ok) return { milestones: retry.data.milestones, usage: retry.usage };

    if (retry.finishReason === 'length') {
      throw new Error(
        `AI plan generation exceeded the token limit even after a retry (${MILESTONES_MAX_TOKENS_RETRY} completion tokens). ` +
          `The plan is too large — trim the project scope or lower per-task requirements.`,
      );
    }
    throw retry.error;
  }

  throw first.error;
}
