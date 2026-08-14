import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { createPlannerRoute } from './createPlanner';
import { deletePlannerRoute } from './deletePlanner';
import { listPlannerRoute } from './listPlanner';
import { updatePlannerRoute } from './updatePlanner';

export function plannerRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(listPlannerRoute.route, listPlannerRoute.handler);
  app.openapi(createPlannerRoute.route, createPlannerRoute.handler);
  app.openapi(updatePlannerRoute.route, updatePlannerRoute.handler);
  app.openapi(deletePlannerRoute.route, deletePlannerRoute.handler);

  return app;
}
