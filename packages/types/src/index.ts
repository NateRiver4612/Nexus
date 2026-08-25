import type { z } from 'zod';

import {
  aiRunListSchema,
  aiRunSchema,
  aiSuggestionListSchema,
  aiSuggestionSchema,
  artifactListSchema,
  artifactSchema,
  createArtifactSchema,
  createAiSuggestionSchema,
  createConversationSchema,
  createKnowledgeItemSchema,
  createMessageSchema,
  createNotificationSchema,
  createPlannerItemSchema,
  createProjectSchema,
  errorResponseSchema,
  errorSchema,
  idParamsSchema,
  idSchema,
  knowledgeItemListSchema,
  knowledgeItemSchema,
  messageListSchema,
  messageSchema,
  notificationListSchema,
  notificationSchema,
  okSchema,
  paginationSchema,
  plannerItemListSchema,
  plannerItemSchema,
  projectIdParamsSchema,
  projectListSchema,
  projectSchema,
  searchQuerySchema,
  searchResultSchema,
  searchResultsSchema,
  updateArtifactSchema,
  updateAiSuggestionSchema,
  updateConversationSchema,
  updateKnowledgeItemSchema,
  updatePlannerItemSchema,
  updateProjectSchema,
  userSchema,
  conversationListSchema,
  conversationSchema,
} from '@nexus/zod-schemas';

export type Id = z.infer<typeof idSchema>;
export type IdParams = z.infer<typeof idParamsSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
export type AiSuggestionList = z.infer<typeof aiSuggestionListSchema>;
export type CreateAiSuggestionInput = z.infer<typeof createAiSuggestionSchema>;
export type UpdateAiSuggestionInput = z.infer<typeof updateAiSuggestionSchema>;

export type AiRun = z.infer<typeof aiRunSchema>;
export type AiRunList = z.infer<typeof aiRunListSchema>;

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationList = z.infer<typeof conversationListSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

export type Message = z.infer<typeof messageSchema>;
export type MessageList = z.infer<typeof messageListSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export type Project = z.infer<typeof projectSchema>;
export type ProjectList = z.infer<typeof projectListSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export type PlannerItem = z.infer<typeof plannerItemSchema>;
export type PlannerItemList = z.infer<typeof plannerItemListSchema>;
export type CreatePlannerItemInput = z.infer<typeof createPlannerItemSchema>;
export type UpdatePlannerItemInput = z.infer<typeof updatePlannerItemSchema>;

export type Artifact = z.infer<typeof artifactSchema>;
export type ArtifactList = z.infer<typeof artifactListSchema>;
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;

export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type KnowledgeItemList = z.infer<typeof knowledgeItemListSchema>;
export type CreateKnowledgeItemInput = z.infer<typeof createKnowledgeItemSchema>;
export type UpdateKnowledgeItemInput = z.infer<typeof updateKnowledgeItemSchema>;

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchResults = z.infer<typeof searchResultsSchema>;

export type User = z.infer<typeof userSchema>;

export type Ok = z.infer<typeof okSchema>;
export type ApiError = z.infer<typeof errorSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export type ApiModule =
  'ai' | 'projects' | 'planner' | 'artifacts' | 'knowledge' | 'notifications' | 'search' | 'users';

export type ApiContext = {
  user: { id: string; email: string; name: string | null } | null;
  set: (user: ApiContext['user']) => void;
};

export type ApiList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
