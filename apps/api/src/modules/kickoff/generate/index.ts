import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import type { KickoffContext } from '../prompts';
import { generateMilestones } from './milestones';
import { generateSummary } from './summary';
import { mergeUsage } from './toolCall';

export type GeneratedKickoffPlan = {
  data: KickoffPlanType;
  usage?: CompletionUsage;
};

/**
 * Kickoff generation is two separate, smallish tool calls instead of one giant
 * forced-JSON payload:
 *   1. `generate_project_milestones` — the big structural plan (milestones,
 *      tasks, steps, dods). The half that used to drop out or truncate.
 *   2. `generate_project_summary` — a small summary object, grounded on a
 *      compact rendering of the generated milestones.
 * Each stage has its own budget and corrective retry, so a failure in one no
 * longer compounds into "the whole plan came back broken".
 */
export async function generateKickoffPlan(context: KickoffContext): Promise<GeneratedKickoffPlan> {
  const milestonesResult = await generateMilestones(context);
  const summaryResult = await generateSummary(context, milestonesResult.milestones);

  return {
    data: {
      summary: summaryResult.summary,
      milestones: milestonesResult.milestones,
    },
    usage: mergeUsage(milestonesResult.usage, summaryResult.usage),
  };
}
