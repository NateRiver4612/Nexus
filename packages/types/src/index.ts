import type { z } from 'zod';

import {
  artifactSchema,
  createArtifactSchema,
  createKnowledgeItemSchema,
  createPlannerItemSchema,
  createProjectSchema,
  idSchema,
  knowledgeItemSchema,
  notificationSchema,
  paginationSchema,
  plannerItemSchema,
  projectSchema,
  searchQuerySchema,
  updateArtifactSchema,
  updateKnowledgeItemSchema,
  updatePlannerItemSchema,
  updateProjectSchema,
} from '@nexus/zod-schemas';

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export type PlannerItem = z.infer<typeof plannerItemSchema>;
export type CreatePlannerItemInput = z.infer<typeof createPlannerItemSchema>;
export type UpdatePlannerItemInput = z.infer<typeof updatePlannerItemSchema>;

export type Artifact = z.infer<typeof artifactSchema>;
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;

export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type CreateKnowledgeItemInput = z.infer<typeof createKnowledgeItemSchema>;
export type UpdateKnowledgeItemInput = z.infer<typeof updateKnowledgeItemSchema>;

export type Notification = z.infer<typeof notificationSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type Id = z.infer<typeof idSchema>;

export type ApiModule =
  'projects' | 'planner' | 'artifacts' | 'knowledge' | 'notifications' | 'search' | 'users';

export type ApiContext = {
  user: { id: string; email: string; name: string | null } | null;
  set: (user: ApiContext['user']) => void;
};

export interface ApiError {
  error: {
    type: 'AuthError' | 'ValidationError' | 'NotFoundError' | 'ServerError';
    message: string;
    issues?: Record<string, unknown>;
  };
}

export type ApiList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
