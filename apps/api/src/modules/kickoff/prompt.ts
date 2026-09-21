import type { OnboardingDataType } from '@nexus/types';
import type { KnowledgeChunkGroup } from './context';

export type KickoffContext = {
  stepData: OnboardingDataType;
  knowledgeChunks: KnowledgeChunkGroup[];
};

export function buildKickoffPrompt({ stepData, knowledgeChunks }: KickoffContext): string {
  const { step1, step2, step4 } = stepData;

  const sections = [
    `Project name: ${step1.name}`,
    `Category: ${step1.category}`,
    step1?.description ? `Description: ${step1.description}` : null,
    `Goal: ${step2.context}`,
    `Requested deliverables: ${step4.deliverables.map((d) => d.name).join(', ')}`,
  ].filter(Boolean);

  const knowledgeSection = knowledgeChunks.length
    ? [
        '\nRelevant excerpts from uploaded resources (ranked by relevance to the project goal — use these to ground the plan, reference specific content where it applies):',
        ...knowledgeChunks.flatMap((group) => [
          `\nFrom "${group.title}":`,
          ...group.excerpts.map((excerpt) => `- ${excerpt}`),
        ]),
      ].join('\n')
    : '\nNo resources were uploaded — base the plan on the goal description alone.';

  return `${sections.join('\n')}\n${knowledgeSection}`;
}
