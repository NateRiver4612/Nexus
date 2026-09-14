import type { SearchQueryType } from '@nexus/types';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

export const onboardingKeys = {
  all: ['projects', 'onboarding'] as const,
  draft: ['projects', 'onboarding', 'draft'] as const,
};

export const plannerKeys = {
  all: ['planner'] as const,
  list: (projectId: string) => ['planner', 'list', projectId] as const,
  detail: (id: string) => ['planner', id] as const,
};

export const artifactKeys = {
  all: ['artifacts'] as const,
  list: (projectId: string) => ['artifacts', 'list', projectId] as const,
  detail: (id: string) => ['artifacts', id] as const,
};

export const deliverableKeys = {
  all: ['deliverables'] as const,
  system: ['deliverables', 'system'] as const,
  list: (projectId: string) => ['deliverables', 'list', projectId] as const,
};

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  list: (projectId: string) => ['knowledge', 'list', projectId] as const,
  sources: (projectId: string) => ['knowledge', 'sources', projectId] as const,
  detail: (id: string) => ['knowledge', id] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
};

export const userKeys = {
  me: ['users', 'me'] as const,
};

export const searchKeys = {
  results: (query: SearchQueryType) => ['search', query] as const,
};

export const aiSuggestionKeys = {
  all: ['ai', 'suggestions'] as const,
  list: (projectId: string) => ['ai', 'suggestions', projectId] as const,
};

export const aiRunKeys = {
  all: ['ai', 'runs'] as const,
  list: (projectId: string) => ['ai', 'runs', projectId] as const,
  detail: (id: string) => ['ai', 'runs', id] as const,
};

export const conversationKeys = {
  all: ['ai', 'conversations'] as const,
  list: (projectId: string) => ['ai', 'conversations', projectId] as const,
  detail: (id: string) => ['ai', 'conversations', id] as const,
};

export const messageKeys = {
  all: ['ai', 'messages'] as const,
  list: (conversationId: string) => ['ai', 'messages', conversationId] as const,
};
