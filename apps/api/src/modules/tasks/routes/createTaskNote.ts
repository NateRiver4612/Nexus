import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createTaskNoteSchema,
  errorResponseSchema,
  taskCompleteParamsSchema,
  taskNoteSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireTaskAccess } from '../middlewares';
import { TaskService } from '../service';
import { HttpError } from '../../../errors';

export const createTaskNoteRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/:taskId/notes',
    request: {
      params: taskCompleteParamsSchema,
      body: {
        content: { 'application/json': { schema: createTaskNoteSchema } },
        required: true,
      },
    },
    middleware: [requireTaskAccess],
    responses: {
      201: {
        content: { 'application/json': { schema: taskNoteSchema } },
        description: 'Task note created',
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
        description: 'Task not found',
      },
    },
  }),
  handler: async (c) => {
    const { taskId } = c.req.valid('param');
    const body = c.req.valid('json');

    const db = getDb();
    const taskService = TaskService(db);

    const note = await taskService.createNote(taskId, body);
    if (!note) throw HttpError.notFound('Task not found.');

    return c.json(note, 201);
  },
});
