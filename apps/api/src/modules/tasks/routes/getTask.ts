import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, taskDetailSchema, taskIdParamsSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const getTaskRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:taskId',
    request: {
      params: taskIdParamsSchema,
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskDetailSchema } },
        description: 'Task detail retrieved',
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

    const task = await taskService.getDetail(taskId);
    if (!task) throw HttpError.notFound('Task not found');

    return c.json(task, 200);
  },
});
