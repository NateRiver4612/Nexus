import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  taskDodSchema,
  taskDodParamsSchema,
  taskItemStatusUpdateSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskRepository } from '../repository';
import { HttpError } from '../../../errors';

export const updateTaskDodStatusRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId/dods/:dodId',
    request: {
      params: taskDodParamsSchema,
      body: {
        content: { 'application/json': { schema: taskItemStatusUpdateSchema } },
        required: true,
      },
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskDodSchema } },
        description: 'Task DoD item status updated',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Invalid status',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Task or DoD item not found',
      },
    },
  }),
  handler: async (c) => {
    const { taskId, dodId } = c.req.valid('param');
    const { status } = c.req.valid('json');

    const db = getDb();
    const repository = TaskRepository(db);

    const [dod] = await repository.updateDodStatus(taskId, dodId, status);
    if (!dod) throw HttpError.notFound('Task DoD item not found.');

    return c.json(
      {
        id: dod.id,
        taskId: dod.taskId,
        value: dod.value,
        position: dod.position,
        status: dod.status,
        createdAt: dod.createdAt.toISOString(),
        updatedAt: dod.updatedAt.toISOString(),
      },
      200,
    );
  },
});
