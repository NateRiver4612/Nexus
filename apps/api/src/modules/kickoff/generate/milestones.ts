import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { kickoffMilestonesSchema, kickoffMilestonesToolSchema } from '@nexus/zod-schemas';
import {
  buildMilestonesSystemPrompt,
  buildMilestonesUserPrompt,
  type KickoffContext,
} from '../prompts';
import { attemptToolCallWithRetry, type AttemptToolCallFailure } from './toolCall';
import type { ChatMessage } from '../../ai/types';

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

/**
 * Field-level length/shape failures — feed the exact issue paths back so the
 * model shortens/repairs precisely those fields instead of rerolling blindly.
 */
function buildMilestonesCorrection({
  issues = [],
  missingKeys = [],
}: AttemptToolCallFailure): string | null {
  if (issues.length > 0) {
    return (
      `Your previous response failed validation. Fix exactly these issues and \
re-output the FULL "milestones" array (every milestone's tasks fully populated with "steps", "dods" \
and "estimatedTimeMinutes"; shorten any over-length field to respect its limit — task descriptions \
<=260 chars, milestone descriptions <=360 chars, step/DoD values <=190 chars, titles <=120 chars):\n` +
      issues.map((issue) => `- ${issue}`).join('\n')
    );
  }

  if (missingKeys.length > 0) {
    return (
      `Your previous response was incomplete: it was missing required field(s): ` +
      `${missingKeys.join(', ')}. Re-generate the FULL "milestones" array — every milestone's ` +
      `tasks fully populated with "steps", "dods" and "estimatedTimeMinutes". Never omit any ` +
      `required field.`
    );
  }

  return null;
}

export async function generateMilestones(context: KickoffContext): Promise<MilestonesResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildMilestonesSystemPrompt(context.stepData) },
    { role: 'user', content: buildMilestonesUserPrompt(context) },
  ];

  const { data, usage } = await attemptToolCallWithRetry({
    messages,
    toolName: MILESTONES_TOOL_NAME,
    toolParamsSchema: kickoffMilestonesToolSchema,
    validateSchema: kickoffMilestonesSchema,
    maxTokens: MILESTONES_MAX_TOKENS,
    maxTokensRetry: MILESTONES_MAX_TOKENS_RETRY,
    label: 'plan generation',
    buildCorrection: buildMilestonesCorrection,
  });

  return { milestones: data.milestones, usage };
}
