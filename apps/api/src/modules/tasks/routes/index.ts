import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { completeTaskRoute } from './completeTask';
import { createTaskNoteRoute } from './createTaskNote';
import { deleteTaskNoteRoute } from './deleteTaskNote';
import { getTaskNoteRoute } from './getTaskNote';
import { getTaskNotesRoute } from './getTaskNotes';
import { getTaskRoute } from './getTask';
import { updateTaskDodStatusRoute } from './updateTaskDodStatus';
import { updateTaskRoute } from './updateTask';
import { updateTaskNoteRoute } from './updateTaskNote';
import { updateTaskStepStatusRoute } from './updateTaskStepStatus';

export function taskRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getTaskRoute.route, handler: getTaskRoute.handler },
    { route: updateTaskRoute.route, handler: updateTaskRoute.handler },
    { route: updateTaskStepStatusRoute.route, handler: updateTaskStepStatusRoute.handler },
    { route: updateTaskDodStatusRoute.route, handler: updateTaskDodStatusRoute.handler },
    { route: completeTaskRoute.route, handler: completeTaskRoute.handler },
    { route: getTaskNotesRoute.route, handler: getTaskNotesRoute.handler },
    { route: getTaskNoteRoute.route, handler: getTaskNoteRoute.handler },
    { route: createTaskNoteRoute.route, handler: createTaskNoteRoute.handler },
    { route: updateTaskNoteRoute.route, handler: updateTaskNoteRoute.handler },
    { route: deleteTaskNoteRoute.route, handler: deleteTaskNoteRoute.handler },
  ] as const);
}
