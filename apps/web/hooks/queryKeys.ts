import type { SearchQuery } from '@nexus/types';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
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

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  list: (projectId: string) => ['knowledge', 'list', projectId] as const,
  detail: (id: string) => ['knowledge', id] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
};

export const userKeys = {
  me: ['users', 'me'] as const,
};

export const searchKeys = {
  results: (query: SearchQuery) => ['search', query] as const,
};
