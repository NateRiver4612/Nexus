import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createAiSuggestionRoute } from './createAiSuggestion';
import { createConversationRoute } from './createConversation';
import { deleteAiSuggestionRoute } from './deleteAiSuggestion';
import { getAiRunRoute } from './getAiRun';
import { listAiRunsRoute } from './listAiRuns';
import { listAiSuggestionsRoute } from './listAiSuggestions';
import { listConversationsRoute } from './listConversations';
import { listMessagesRoute } from './listMessages';
import { postMessageRoute } from './postMessage';
import { updateAiSuggestionRoute } from './updateAiSuggestion';
import { updateConversationRoute } from './updateConversation';

export function aiRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: listAiSuggestionsRoute.route, handler: listAiSuggestionsRoute.handler },
    { route: createAiSuggestionRoute.route, handler: createAiSuggestionRoute.handler },
    { route: updateAiSuggestionRoute.route, handler: updateAiSuggestionRoute.handler },
    { route: deleteAiSuggestionRoute.route, handler: deleteAiSuggestionRoute.handler },
    { route: listAiRunsRoute.route, handler: listAiRunsRoute.handler },
    { route: getAiRunRoute.route, handler: getAiRunRoute.handler },
    { route: listConversationsRoute.route, handler: listConversationsRoute.handler },
    { route: createConversationRoute.route, handler: createConversationRoute.handler },
    { route: updateConversationRoute.route, handler: updateConversationRoute.handler },
    { route: listMessagesRoute.route, handler: listMessagesRoute.handler },
    { route: postMessageRoute.route, handler: postMessageRoute.handler },
  ] as const);
}
