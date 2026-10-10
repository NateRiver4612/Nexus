import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  taskDetailSchema,
  taskCompleteParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskRepository } from '../repository';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const reopenTaskRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId/reopen',
    request: {
      params: taskCompleteParamsSchema,
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskDetailSchema } },
        description: 'Task re-opened',
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
    const repository = TaskRepository(db);

    const [task] = await repository.reopenTask(taskId);
    if (!task) throw HttpError.notFound('Task not found.');

    const taskService = TaskService(db);
    const detail = await taskService.getDetail(taskId);
    return c.json(detail!, 200);
  },
});
