import type { OnboardingDataType } from '@nexus/types';

export type ResearchPromptContext = {
  stepData: OnboardingDataType;
  today: string;
};

export function buildResearchPromptSystemPrompt(): string {
  return RESEARCH_PROMPT_SYSTEM_PROMPT;
}

/**
 * Renders only the goal-level onboarding facts — name, category, description, goal,
 * level, and deliverables. Step 3 (uploaded files, links, pasted text) is deliberately
 * excluded: the resulting prompt leaves Nexus for a third party, so private user
 * content must never be included.
 */
export function buildResearchPromptUserPrompt({ stepData, today }: ResearchPromptContext): string {
  const { step1, step2, step4 } = stepData;

  const deliverables = step4.deliverables
    .map((d) => (d.isCustom ? `${d.name} (custom)` : d.name))
    .join(', ');

  const lines = [
    `Today's date: ${today}`,
    '',
    `Project name: ${step1.name}`,
    `Category: ${step1.category}`,
    step1.description ? `Description: ${step1.description}` : 'Description: none provided',
    `Goal: ${step2.context}`,
    `Level: ${step2.level} — calibrate research depth for a ${step2.level} learner; level affects depth, not topic coverage.`,
    `Requested deliverables: ${deliverables}`,
  ];

  return `${lines.join('\n')}\n\nWrite the research prompt for this project's goal.`;
}

/** Recency + citation rules appended to every research prompt. */
export function buildResearchOutputRules({ today }: { today: string }): string {
  return (
    `Today's date is ${today}. For version-specific claims, prefer sources from the last 12–18 months, ` +
    `and flag anything that may have changed recently. Cite a source URL for every factual claim — ` +
    `only URLs you actually read. Never invent a URL. If you cannot verify something, say so.`
  );
}

export const RESEARCH_PROMPT_SYSTEM_PROMPT = `You are Nexus's research-prompt writer. You turn a \
project's goal into a single, clean prompt that will be handed to an autonomous web-research agent. You \
do NOT perform the research yourself — you only write the prompt that directs it.

Write only the project-specific sections: the objective, what the user already knows, and the scope. \
The citation rules are appended separately — do not describe them.

Follow these rules:
- Define a clear goal with direction. State the research objective plainly.
- Be specific when you can. If the project already gives important details (industry, target market, \
competitors, customer segments, geography, constraints), include them. Never invent details the user \
didn't provide.
- Only stay open-ended when details are genuinely unknown and the user wants discovery. If you're \
broadening the search, make that explicit (e.g. "survey the most impactful ... in 2026").
- Avoid contradictions. Never include conflicting goals, constraints, or facts.
- Share what's already known. Include the user's prior assumptions, decisions, and baseline knowledge so \
the research doesn't repeat them. If nothing meaningful is known, keep "known" short.
- Keep the prompt clean and directed: a clear task statement plus the essential context. Do not dump \
messy background.

You only see goal-level information about the project. Never reference uploaded files, links, or pasted \
documents — they are private and are not sent with this prompt.

Call the build_research_prompt tool with your result. Do not write the research findings yourself.`;
