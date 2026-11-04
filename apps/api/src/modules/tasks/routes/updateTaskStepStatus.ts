import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  successResponseSchema,
  taskItemStatusUpdateSchema,
  taskStepSchema,
  taskStepParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskRepository } from '../repository';
import { ensureExists } from '../../../errors';

export const updateTaskStepStatusRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId/steps/:stepId',
    request: {
      params: taskStepParamsSchema,
      body: {
        content: { 'application/json': { schema: taskItemStatusUpdateSchema } },
        required: true,
      },
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: successResponseSchema(taskStepSchema) } },
        description: 'Task step status updated',
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
        description: 'Task or step not found',
      },
    },
  }),
  handler: async (c) => {
    const { taskId, stepId } = c.req.valid('param');
    const { status } = c.req.valid('json');

    const db = getDb();
    const repository = TaskRepository(db);

    const step = ensureExists((await repository.updateStepStatus(taskId, stepId, status))[0]);

    return c.json(
      {
        data: {
          id: step.id,
          taskId: step.taskId,
          value: step.value,
          position: step.position,
          status: step.status,
          createdAt: step.createdAt.toISOString(),
          updatedAt: step.updatedAt.toISOString(),
        },
        message: 'Step updated',
      },
      200,
    );
  },
});
