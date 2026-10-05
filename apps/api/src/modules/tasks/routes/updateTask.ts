import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  taskDetailSchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const updateTaskRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId',
    request: {
      params: taskIdParamsSchema,
      body: {
        content: { 'application/json': { schema: updateTaskSchema } },
        required: true,
      },
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskDetailSchema } },
        description: 'Task updated',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Invalid task fields',
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
    const body = c.req.valid('json');

    const db = getDb();
    const taskService = TaskService(db);

    const task = await taskService.update(taskId, body);
    if (!task) throw HttpError.notFound('Task not found.');

    return c.json(task, 200);
  },
});
