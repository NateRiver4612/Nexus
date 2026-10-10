import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  taskDetailSchema,
  taskCompleteParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const completeTaskRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId/complete',
    request: {
      params: taskCompleteParamsSchema,
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskDetailSchema } },
        description: 'Task completed',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Not all DoD items are completed',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Task not found',
      },
    },
  }),
  handler: async (c) => {
    const { taskId } = c.req.valid('param');

    const db = getDb();
    const taskService = TaskService(db);

    // Completes the task (DoD-gated) and auto-advances the current task to the
    // next non-completed task in the milestone — or the next milestone.
    const detail = await taskService.complete(taskId);
    if (!detail) throw HttpError.notFound('Task not found.');

    return c.json(detail, 200);
  },
});
