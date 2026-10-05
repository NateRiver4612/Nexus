import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { completeTaskRoute } from './completeTask';
import { getTaskRoute } from './getTask';
import { updateTaskDodStatusRoute } from './updateTaskDodStatus';
import { updateTaskRoute } from './updateTask';
import { updateTaskStepStatusRoute } from './updateTaskStepStatus';

export function taskRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getTaskRoute.route, handler: getTaskRoute.handler },
    { route: updateTaskRoute.route, handler: updateTaskRoute.handler },
    { route: updateTaskStepStatusRoute.route, handler: updateTaskStepStatusRoute.handler },
    { route: updateTaskDodStatusRoute.route, handler: updateTaskDodStatusRoute.handler },
    { route: completeTaskRoute.route, handler: completeTaskRoute.handler },
  ] as const);
}
