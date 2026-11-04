import type { KickoffPlanType, RunStageType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import type { KickoffContext } from '../prompts';
import { generateMilestones } from './milestones';
import { generateSummary } from './summary';
import { mergeUsage } from './toolCall';

export type GeneratedKickoffPlan = {
  data: KickoffPlanType;
  usage?: CompletionUsage;
};

export type GenerateKickoffPlanOptions = {
  /** Reports coarse progress as the plan moves through its stages. */
  onStage?: (stage: RunStageType) => void | Promise<unknown>;
};

/**
 * Assigns each item's `position` from its array index. The model no longer authors
 * `position`, so without this every item would fall back to the schema default of 0 —
 * this keeps the plan's ordering explicit in `aiRun.data` for the client and any
 * future reorder/reset UI. (Persistence still renumbers from array order, so the
 * final order always reflects what was actually submitted.)
 */
function withPositions(plan: KickoffPlanType): KickoffPlanType {
  return {
    ...plan,
    milestones: plan.milestones.map((milestone, milestoneIndex) => ({
      ...milestone,
      position: milestoneIndex,
      tasks: milestone.tasks.map((task, taskIndex) => ({
        ...task,
        position: taskIndex,
        steps: task.steps.map((step, stepIndex) => ({ ...step, position: stepIndex })),
        dods: task.dods.map((dod, dodIndex) => ({ ...dod, position: dodIndex })),
      })),
    })),
  };
}

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
export async function generateKickoffPlan(
  context: KickoffContext,
  { onStage }: GenerateKickoffPlanOptions = {},
): Promise<GeneratedKickoffPlan> {
  await onStage?.('drafting_milestones');
  const milestonesResult = await generateMilestones(context);

  await onStage?.('drafting_summary');
  const summaryResult = await generateSummary(context, milestonesResult.milestones);

  return {
    data: withPositions({
      summary: summaryResult.summary,
      milestones: milestonesResult.milestones,
    }),
    usage: mergeUsage(milestonesResult.usage, summaryResult.usage),
  };
}
