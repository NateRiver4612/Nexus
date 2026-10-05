import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createPlannerRoute } from './createPlanner';
import { deletePlannerRoute } from './deletePlanner';
import { listPlannerRoute } from './listPlanner';
import { updatePlannerRoute } from './updatePlanner';

export function plannerRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: listPlannerRoute.route, handler: listPlannerRoute.handler },
    { route: createPlannerRoute.route, handler: createPlannerRoute.handler },
    { route: updatePlannerRoute.route, handler: updatePlannerRoute.handler },
    { route: deletePlannerRoute.route, handler: deletePlannerRoute.handler },
  ] as const);
}
