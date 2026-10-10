import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createDeliverableRoute } from './createDeliverable';
import { getDeliverablesRoute } from './getDeliverables';

export function deliverableRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getDeliverablesRoute.route, handler: getDeliverablesRoute.handler },
    { route: createDeliverableRoute.route, handler: createDeliverableRoute.handler },
  ] as const);
}
