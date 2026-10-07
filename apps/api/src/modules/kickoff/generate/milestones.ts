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

  // Any failure becomes a single escalated retry with corrective feedback.
  const missingKeys = first.missingKeys ?? [];
  const validationIssues = first.issues ?? [];
  const retryMessages = [...messages];

  if (validationIssues.length > 0) {
    // Field-level length/shape failures — feed the exact issue paths back so the
    // model shortens/repairs precisely those fields instead of rerolling blindly.
    const correction = `Your previous response failed validation. Fix exactly these issues and \
re-output the FULL "milestones" array (every milestone's tasks fully populated with "steps", "dods" \
and "estimatedTimeMinutes"; shorten any over-length field to respect its limit — task descriptions \
<=200 chars, milestone descriptions <=300 chars, step/DoD values <=150 chars, titles <=100 chars):\n` +
      validationIssues.map((issue) => `- ${issue}`).join('\n');
    retryMessages.push({ role: 'user', content: correction });
  } else if (first.finishReason === 'length') {
    console.error(`[kickoff] milestones first attempt truncated — retrying with ${MILESTONES_MAX_TOKENS_RETRY} tokens.`);
  } else if (missingKeys.length > 0) {
    const correction = `Your previous response was incomplete: it was missing required field(s): ` +
      `${missingKeys.join(', ')}. Re-generate the FULL "milestones" array — every milestone's ` +
      `tasks fully populated with "steps", "dods" and "estimatedTimeMinutes". Never omit any ` +
      `required field.`;
    retryMessages.push({ role: 'user', content: correction });
  }

  const retry = await attemptToolCall({
    messages: retryMessages,
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
