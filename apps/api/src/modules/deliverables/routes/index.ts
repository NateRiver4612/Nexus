import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createDeliverableRoute } from './createDeliverable';
import { deleteDeliverableRoute } from './deleteDeliverable';
import { getDeliverablesRoute } from './getDeliverables';
import { getSystemDeliverablesRoute } from './getSystemDeliverables';

export function deliverableRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getSystemDeliverablesRoute.route, handler: getSystemDeliverablesRoute.handler },
    { route: getDeliverablesRoute.route, handler: getDeliverablesRoute.handler },
    { route: createDeliverableRoute.route, handler: createDeliverableRoute.handler },
    { route: deleteDeliverableRoute.route, handler: deleteDeliverableRoute.handler },
  ] as const);
}
