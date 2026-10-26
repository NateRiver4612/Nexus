import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  successResponseSchema,
  taskDetailSchema,
  taskCompleteParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskRepository } from '../repository';
import { TaskService } from '../service';
import { ensureExists } from '../../../errors';

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
        content: { 'application/json': { schema: successResponseSchema(taskDetailSchema) } },
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
    ensureExists(task);

    const taskService = TaskService(db);
    const detail = ensureExists(await taskService.getDetail(taskId));
    return c.json({ data: detail, message: 'Task reopened' }, 200);
  },
});
