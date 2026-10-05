import type { MiddlewareHandler } from 'hono';
import { getDb } from '@nexus/db';

import { HttpError } from '../../errors';
import { getUser } from '../../auth-middleware';
import { ProjectsRepository } from '../projects/repository';
import { TaskRepository } from './repository';

/**
 * Guards the standalone `GET /tasks/:taskId` route. The path has no
 * `projectId`, so access is resolved through the task row: load the task,
 * require its project to exist, then require the user to be a workspace
 * member — same "not found" treatment as `requireProjectAccess`.
 *
 * Reads path params via `c.req.param()` — route middleware runs before the
 * zValidator middleware, so `c.req.valid()` is not available here.
 */
export const requireTaskAccess: MiddlewareHandler = async (c, next) => {
  const user = getUser(c);
  const db = getDb();

  const taskId = c.req.param('taskId')!;

  const task = await TaskRepository(db).getById(taskId);
  if (!task) {
    throw HttpError.notFound('Task not found.');
  }

  const project = await ProjectsRepository(db).getByIdRaw(task.projectId);
  if (!project) {
    throw HttpError.notFound('Task not found.');
  }

  const isMember = await ProjectsRepository(db).isWorkspaceMember(user.id, project.workspaceId);
  if (!isMember) {
    throw HttpError.notFound('Task not found.');
  }

  c.set('task', task);
  await next();
};
