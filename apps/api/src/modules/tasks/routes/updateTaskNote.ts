import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  taskNoteParamsSchema,
  taskNoteSchema,
  updateTaskNoteSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const updateTaskNoteRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:taskId/notes/:noteId',
    request: {
      params: taskNoteParamsSchema,
      body: {
        content: { 'application/json': { schema: updateTaskNoteSchema } },
        required: true,
      },
    },
    middleware: [requireTaskAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: taskNoteSchema } },
        description: 'Task note updated',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Invalid note fields',
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
    const body = c.req.valid('json');

    const db = getDb();
    const taskService = TaskService(db);

    const note = await taskService.updateNote(taskId, noteId, body);
    if (!note) throw HttpError.notFound('Task note not found.');

    return c.json(note, 200);
  },
});
