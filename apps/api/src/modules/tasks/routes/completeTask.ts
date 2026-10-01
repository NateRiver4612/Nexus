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
    const repository = TaskRepository(db);

    const dods = await repository.listDods(taskId);

    // The "definition of done" gates completion: every DOD must be satisfied.
    if (dods.some((dod) => dod.status !== 'completed')) {
      throw HttpError.validation(
        'Complete every definition-of-done item before completing the task.',
      );
    }

    const [task] = await repository.completeTask(taskId);
    if (!task) throw HttpError.notFound('Task not found.');

    const taskService = TaskService(db);
    const detail = await taskService.getDetail(taskId);
    return c.json(detail!, 200);
  },
});
