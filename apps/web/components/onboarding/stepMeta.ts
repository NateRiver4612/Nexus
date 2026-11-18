import { DEFAULT_ONBOARDING_CATEGORIES, ONBOARDING_LEVELS } from '@nexus/zod-schemas/constants';

/**
 * Onboarding is one connected workflow: the numbered cards, the header stepper,
 * and the live preview all read this list so their order can never drift apart.
 */
export const ONBOARDING_STEPS = [
  {
    id: 'identity',
    tone: 'action',
    title: 'Project Identity & Category',
    shortTitle: 'Identity & Category',
    description: 'Give your workspace a clear name, context summary, and domain lens.',
    nextLabel: '02 Goal & Track',
  },
  {
    id: 'goal',
    tone: 'primary',
    title: 'Goal, Background & Starting Track',
    shortTitle: 'Goal & Track',
    description: 'Share your experience level so Nexus calibrates milestone depth and pace.',
    nextLabel: '03 Knowledge Sources',
  },
  {
    id: 'sources',
    tone: 'secondary',
    title: 'Knowledge Sources & Context',
    shortTitle: 'Knowledge Sources',
    description: 'Attach courses, docs, or repositories so Nexus grounds every milestone.',
    nextLabel: '04 Deliverables',
  },
  {
    id: 'deliverables',
    tone: 'accent',
    title: 'Target Deliverables & Outputs',
    shortTitle: 'Deliverables',
    description: 'Select the artifacts Nexus should scaffold and keep updated as you progress.',
    nextLabel: null,
  },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];
export type OnboardingLevel = (typeof ONBOARDING_LEVELS)[number]['value'];

/** Milestone targets per level — mirrors the copy shown on the level cards. */
export const LEVEL_MILESTONES: Record<OnboardingLevel, number> = {
  beginner: 4,
  intermediate: 6,
  advanced: 8,
};

/** Display-only pacing hint shown beside the milestone count. */
export const LEVEL_PACE: Record<OnboardingLevel, string> = {
  beginner: '~45m/day',
  intermediate: '~1.5h/day',
  advanced: 'Deep-dive arc',
};

export const getLevelMeta = (level?: string | null) => {
  if (!level) return undefined;
  return ONBOARDING_LEVELS.find((item) => item.value === level);
};

export const getMilestoneCount = (level?: string | null) => {
  if (!level) return null;
  const milestones = LEVEL_MILESTONES[level as OnboardingLevel];
  return typeof milestones === 'number' ? milestones : null;
};

export const getCategoryMeta = (category?: string | null) => {
  if (!category) return undefined;
  return DEFAULT_ONBOARDING_CATEGORIES.find((item) => item.value === category);
};
