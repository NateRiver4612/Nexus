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

/**
 * A stage that already succeeded on an earlier attempt of the same run. `usage` carries
 * the token counts of those skipped calls so the run's final totals still include them.
 */
export type KickoffCheckpoint = {
  milestones?: KickoffPlanType['milestones'];
  summary?: KickoffPlanType['summary'];
  usage?: CompletionUsage;
};

export type GenerateKickoffPlanOptions = {
  /** Reports coarse progress as the plan moves through its stages. */
  onStage?: (stage: RunStageType) => void | Promise<unknown>;
  /** Completed stages from an earlier attempt — reused instead of regenerated. */
  checkpoint?: KickoffCheckpoint;
  /**
   * Fired as soon as a stage succeeds (before the next one starts), so the caller can
   * persist it and skip the expensive call on a BullMQ retry.
   */
  onMilestones?: (
    milestones: KickoffPlanType['milestones'],
    usage?: CompletionUsage,
  ) => void | Promise<unknown>;
  onSummary?: (
    summary: KickoffPlanType['summary'],
    usage?: CompletionUsage,
  ) => void | Promise<unknown>;
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
 *
 * Resume: a stage present in `checkpoint` is reused instead of re-calling the model.
 * This matters because the whole function runs inside one BullMQ job: without it, a
 * summary failure would replay — and re-pay for — the already-successful milestones
 * on the queue's retry. Each successful stage is handed to its callback immediately,
 * so the caller can persist it before the next stage starts.
 */
export async function generateKickoffPlan(
  context: KickoffContext,
  { onStage, checkpoint, onMilestones, onSummary }: GenerateKickoffPlanOptions = {},
): Promise<GeneratedKickoffPlan> {
  let milestones = checkpoint?.milestones;
  let usage = checkpoint?.usage;

  if (!milestones) {
    await onStage?.('drafting_milestones');
    const milestonesResult = await generateMilestones(context);
    milestones = milestonesResult.milestones;
    usage = mergeUsage(usage, milestonesResult.usage);
    await onMilestones?.(milestones, milestonesResult.usage);
  }

  // A summary is only reusable alongside the milestones it was grounded on. If milestones
  // had to be regenerated, an old summary would describe a plan that no longer exists.
  let summary = checkpoint?.milestones ? checkpoint.summary : undefined;

  if (!summary) {
    await onStage?.('drafting_summary');
    const summaryResult = await generateSummary(context, milestones);
    summary = summaryResult.summary;
    usage = mergeUsage(usage, summaryResult.usage);
    await onSummary?.(summary, summaryResult.usage);
  }

  return {
    data: withPositions({ summary, milestones }),
    usage,
  };
}
