import { z } from 'zod';

import {
  aiRunListSchema,
  aiRunSchema,
  aiTaskDataSchema,
  aiSuggestionListSchema,
  aiSuggestionSchema,
  artifactListSchema,
  artifactSchema,
  createArtifactSchema,
  createAiSuggestionSchema,
  createConversationSchema,
  createKnowledgeItemSchema,
  createKnowledgeSourcesSchema,
  createMessageSchema,
  createNotificationSchema,
  createPlannerItemSchema,
  createProjectSchema,
  createUploadUrlResponseSchema,
  createUploadUrlSchema,
  errorResponseSchema,
  errorSchema,
  idParamsSchema,
  idSchema,
  knowledgeItemListSchema,
  knowledgeItemSchema,
  knowledgeSourceListSchema,
  knowledgeSourceSchema,
  messageListSchema,
  messageSchema,
  notificationListSchema,
  notificationSchema,
  okSchema,
  paginationSchema,
  plannerItemListSchema,
  plannerItemSchema,
  milestoneSchema,
  taskSchema,
  projectProgressSchema,
  kickoffPlanSchema,
  completeOnboardingSchema,
  onboardingIdQuerySchema,
  projectIdParamsSchema,
  projectListSchema,
  projectSchema,
  projectDetailListSchema,
  projectDetailSchema,
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
  onboardingStatusSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingDataSchema,
  onboardingStateSchema,
  updateOnboardingSchema,
  createKnowledgeSourceTextSchema,
  createKnowledgeSourceYoutubeSchema,
  createDeliverableSchema,
  assignDeliverablesSchema,
  deliverablesQuerySchema,
  deliverableSchema,
  deliverableListSchema,
  updateDeliverableSchema,
  deliverableParamsSchema,
  deliverableKindSchema,
  aiTaskEnum,
  submitOnboardingOutputSchema,
} from '@nexus/zod-schemas';

export type OnboardingStatusType = z.infer<typeof onboardingStatusSchema>;
export type OnboardingStep1InputType = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2InputType = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3InputType = z.infer<typeof onboardingStep3Schema>;
export type OnboardingStep4InputType = z.infer<typeof onboardingStep4Schema>;
export type OnboardingStep5InputType = z.infer<typeof onboardingStep5Schema>;
export type OnboardingDataType = z.infer<typeof onboardingDataSchema>;
export type OnboardingStateType = z.infer<typeof onboardingStateSchema>;
export type UpdateOnboardingInputType = z.infer<typeof updateOnboardingSchema>;

export type IdType = z.infer<typeof idSchema>;
export type IdParamsType = z.infer<typeof idParamsSchema>;
export type ProjectIdParamsType = z.infer<typeof projectIdParamsSchema>;
export type PaginationQueryType = z.infer<typeof paginationSchema>;

export type AiSuggestionType = z.infer<typeof aiSuggestionSchema>;
export type AiSuggestionListType = z.infer<typeof aiSuggestionListSchema>;
export type CreateAiSuggestionInputType = z.infer<typeof createAiSuggestionSchema>;
export type UpdateAiSuggestionInputType = z.infer<typeof updateAiSuggestionSchema>;

export type AiRunType = z.infer<typeof aiRunSchema>;
export type AiRunListType = z.infer<typeof aiRunListSchema>;

export type ConversationType = z.infer<typeof conversationSchema>;
export type ConversationListType = z.infer<typeof conversationListSchema>;
export type CreateConversationInputType = z.infer<typeof createConversationSchema>;
export type UpdateConversationInputType = z.infer<typeof updateConversationSchema>;

export type MessageType = z.infer<typeof messageSchema>;
export type MessageListType = z.infer<typeof messageListSchema>;
export type CreateMessageInputType = z.infer<typeof createMessageSchema>;

export type ProjectType = z.infer<typeof projectSchema>;
export type ProjectListType = z.infer<typeof projectListSchema>;
export type ProjectDetailType = z.infer<typeof projectDetailSchema>;
export type ProjectDetailListType = z.infer<typeof projectDetailListSchema>;
export type CreateProjectInputType = z.infer<typeof createProjectSchema>;
export type UpdateProjectInputType = z.infer<typeof updateProjectSchema>;

export type PlannerItemType = z.infer<typeof plannerItemSchema>;
export type PlannerItemListType = z.infer<typeof plannerItemListSchema>;
export type MilestoneType = z.infer<typeof milestoneSchema>;
export type TaskType = z.infer<typeof taskSchema>;
export type ProjectProgressType = z.infer<typeof projectProgressSchema>;
export type CompleteOnboardingType = z.infer<typeof completeOnboardingSchema>;
export type SubmitOnboardingOutputType = z.infer<typeof submitOnboardingOutputSchema>;
export type OnboardingIdQueryType = z.infer<typeof onboardingIdQuerySchema>;
export type CreatePlannerItemInputType = z.infer<typeof createPlannerItemSchema>;
export type UpdatePlannerItemInputType = z.infer<typeof updatePlannerItemSchema>;

export type ArtifactType = z.infer<typeof artifactSchema>;
export type ArtifactListType = z.infer<typeof artifactListSchema>;
export type CreateArtifactInputType = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInputType = z.infer<typeof updateArtifactSchema>;

export type KnowledgeItemType = z.infer<typeof knowledgeItemSchema>;
export type KnowledgeItemListType = z.infer<typeof knowledgeItemListSchema>;
export type CreateKnowledgeItemInputType = z.infer<typeof createKnowledgeItemSchema>;
export type UpdateKnowledgeItemInputType = z.infer<typeof updateKnowledgeItemSchema>;

export type KnowledgeSourceType = z.infer<typeof knowledgeSourceSchema>;
export type KnowledgeSourceListType = z.infer<typeof knowledgeSourceListSchema>;
export type CreateKnowledgeSourcesInputType = z.infer<typeof createKnowledgeSourcesSchema>;
export type CreateKnowledgeSourceItemType = CreateKnowledgeSourcesInputType[number];
export type CreateUploadUrlInputType = z.infer<typeof createUploadUrlSchema>;
export type CreateUploadUrlResponseType = z.infer<typeof createUploadUrlResponseSchema>;
export type CreateKnowledgeSourceTextType = z.infer<typeof createKnowledgeSourceTextSchema>;
export type CreateKnowledgeSourceYoutubeType = z.infer<typeof createKnowledgeSourceYoutubeSchema>;
export type DeliverableKindType = z.infer<typeof deliverableKindSchema>;
export type DeliverableType = z.infer<typeof deliverableSchema>;
export type DeliverableListType = z.infer<typeof deliverableListSchema>;
export type CreateDeliverableInputType = z.infer<typeof createDeliverableSchema>;
export type AssignDeliverablesInputType = z.infer<typeof assignDeliverablesSchema>;
export type DeliverablesQueryType = z.infer<typeof deliverablesQuerySchema>;
export type UpdateDeliverableInputType = z.infer<typeof updateDeliverableSchema>;
export type DeliverableParamsType = z.infer<typeof deliverableParamsSchema>;

export type NotificationType = z.infer<typeof notificationSchema>;
export type NotificationListType = z.infer<typeof notificationListSchema>;
export type CreateNotificationInputType = z.infer<typeof createNotificationSchema>;

export type SearchQueryType = z.infer<typeof searchQuerySchema>;
export type SearchResultType = z.infer<typeof searchResultSchema>;
export type SearchResultsType = z.infer<typeof searchResultsSchema>;

export type KickoffPlanType = z.infer<typeof kickoffPlanSchema>;

export type AITaskType = z.infer<typeof aiTaskEnum>;

type AiTaskResultEntry = z.output<typeof aiTaskDataSchema>;

/** Maps each AI task to the shape its result (`aiRun.data`) takes. Schema-derived. */
export type AITaskResultMap = {
  [K in AiTaskResultEntry['aiTask']]: Extract<AiTaskResultEntry, { aiTask: K }>['data'];
};

export type UserType = z.infer<typeof userSchema>;

export type OkType = z.infer<typeof okSchema>;
export type ApiErrorType = z.infer<typeof errorSchema>;
export type ErrorResponseType = z.infer<typeof errorResponseSchema>;

export type ApiModuleType =
  'ai' | 'projects' | 'planner' | 'artifacts' | 'knowledge' | 'notifications' | 'search' | 'users';

export type ApiContextType = {
  user: { id: string; email: string; name: string | null } | null;
  set: (user: ApiContextType['user']) => void;
};

export type ApiListType<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
