import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import {
  KICKOFF_AVERAGE_TASK_MINUTES,
  kickoffMilestonesSchema,
  kickoffMilestonesToolSchema,
} from '@nexus/zod-schemas';
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
 * budget and the escalated retry. The finer 45-minute task breakdown needs more
 * headroom than the old 5-tasks-per-milestone shape.
 */
export const MILESTONES_MAX_TOKENS = 32000;
export const MILESTONES_MAX_TOKENS_RETRY = 40000;

export type MilestonesResult = {
  milestones: KickoffPlanType['milestones'];
  usage?: CompletionUsage;
};

/**
 * Shared rules restated on every retry: the model most often fails by keeping
 * tasks too large or by trimming detail to fit, so spell out the granularity
 * contract alongside the exact validation issues.
 */
const MILESTONES_CORRECTION_RULES =
  `Rules: target 15-20 minutes per task (hard max 30) and keep the plan's average at or below ` +
  `${KICKOFF_AVERAGE_TASK_MINUTES} minutes — split longer work into multiple consecutive tasks inside ` +
  `the same milestone instead of lowering its estimate; do not add milestones to solve granularity; ` +
  `aim for 6-10 tasks per milestone (hard max 12); 1-2 steps for most tasks (max 3) and 2-3 DoDs per ` +
  `task; task descriptions <=260 chars, milestone descriptions <=360 chars, step/DoD values <=190 ` +
  `chars, titles <=120 chars.`;

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
and "estimatedTimeMinutes":\n` +
      issues.map((issue) => `- ${issue}`).join('\n') +
      `\n${MILESTONES_CORRECTION_RULES}`
    );
  }

  if (missingKeys.length > 0) {
    return (
      `Your previous response was incomplete: it was missing required field(s): ` +
      `${missingKeys.join(', ')}. Re-generate the FULL "milestones" array — every milestone's ` +
      `tasks fully populated with "steps", "dods" and "estimatedTimeMinutes". Never omit any ` +
      `required field. ${MILESTONES_CORRECTION_RULES}`
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
