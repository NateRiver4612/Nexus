import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createAiSuggestionRoute } from './createAiSuggestion';
import { createConversationRoute } from './createConversation';
import { deleteAiSuggestionRoute } from './deleteAiSuggestion';
import { getAiRunRoute } from './getAiRun';
import { getAiSuggestionsRoute } from './getAiSuggestions';
import { getConversationsRoute } from './getConversations';
import { getMessagesRoute } from './getMessages';
import { postMessageRoute } from './postMessage';
import { updateAiSuggestionRoute } from './updateAiSuggestion';
import { updateConversationRoute } from './updateConversation';

export function aiRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getAiSuggestionsRoute.route, handler: getAiSuggestionsRoute.handler },
    { route: createAiSuggestionRoute.route, handler: createAiSuggestionRoute.handler },
    { route: updateAiSuggestionRoute.route, handler: updateAiSuggestionRoute.handler },
    { route: deleteAiSuggestionRoute.route, handler: deleteAiSuggestionRoute.handler },
    // { route: getAiRunsRoute.route, handler: getAiRunsRoute.handler },
    { route: getAiRunRoute.route, handler: getAiRunRoute.handler },
    { route: getConversationsRoute.route, handler: getConversationsRoute.handler },
    { route: createConversationRoute.route, handler: createConversationRoute.handler },
    { route: updateConversationRoute.route, handler: updateConversationRoute.handler },
    { route: getMessagesRoute.route, handler: getMessagesRoute.handler },
    { route: postMessageRoute.route, handler: postMessageRoute.handler },
  ] as const);
}
