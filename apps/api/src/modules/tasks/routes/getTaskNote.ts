import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, taskNoteParamsSchema, taskNoteSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { ensureExists } from '../../../errors';

export const getTaskNoteRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:taskId/notes/:noteId',
    request: {
      params: taskNoteParamsSchema,
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskNoteSchema } },
        description: 'Task note retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Task note not found',
      },
    },
  }),
  handler: async (c) => {
    const { taskId, noteId } = c.req.valid('param');

    const db = getDb();
    const taskService = TaskService(db);

    const note = ensureExists(await taskService.getNote(taskId, noteId));

    return c.json(note, 200);
  },
});
