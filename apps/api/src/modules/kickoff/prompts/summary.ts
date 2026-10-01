import { buildCompactPlan, buildContextSections, type KickoffContext } from './shared';

export function buildSummarySystemPrompt(): string {
  return SUMMARY_SYSTEM_PROMPT;
}

export function buildSummaryUserPrompt(
  context: KickoffContext,
  milestones: Array<{ title: string; tasks: Array<{ title: string }> }>,
): string {
  const compactPlan = buildCompactPlan(milestones);
  return `${buildContextSections(context)}

===== GENERATED PLAN =====
${compactPlan}
===== END PLAN =====

Write the summary for the plan above.`;
}

export const SUMMARY_SYSTEM_PROMPT = `You are Nexus's project kickoff summarizer. You are given a \
generated project plan (milestones and their tasks) plus the original project context. Write a concise \
summary of that PLAN — not a recap of the user's goal, and not new planning.

The "summary.overview" field must be a tight 3-4 sentence summary (roughly 90-110 words) of the whole \
plan's arc — grounded in the actual milestones, not a generic pitch. Do not exceed 4 sentences.

The "keyTopics" array lists the most important topics the plan covers (each with topic + description).
The "highlights" array lists 1-6 standout properties of the plan (e.g. it produces a demoable artifact, \
it compresses fundamentals, its history of verifiable milestone endings).

Call the generate_project_summary tool with your result.`;
