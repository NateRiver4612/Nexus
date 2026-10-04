import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, taskCompleteParamsSchema, taskNoteSchema } from '@nexus/zod-schemas';
import { z } from '@hono/zod-openapi';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';

export const getTaskNotesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:taskId/notes',
    request: {
      params: taskCompleteParamsSchema,
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(taskNoteSchema) } },
        description: 'Task notes retrieved',
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

    const notes = await taskService.listNotes(taskId);
    return c.json(notes, 200);
  },
});
