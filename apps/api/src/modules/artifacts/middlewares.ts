import type { MiddlewareHandler } from 'hono';
import { getDb } from '@nexus/db';

import { ensure, ensureExists, NotFoundError } from '../../errors';
import { getUser } from '../../auth-middleware';
import { ProjectsRepository } from '../projects/repository';
import { ArtifactRepository } from './repository';

/**
 * Guards the standalone `GET /artifacts/items/:id/content` route. The path has no
 * `projectId`, so access is resolved through the artifact row: load the artifact,
 * require its project to exist, then require the user to be a workspace member —
 * same "not found" treatment as `requireProjectAccess`.
 *
 * Reads path params via `c.req.param()` — route middleware runs before the
 * zValidator middleware, so `c.req.valid()` is not available here.
 */
export const requireArtifactAccess: MiddlewareHandler = async (c, next) => {
  const user = getUser(c);
  const db = getDb();

  const artifact = ensureExists(
    await ArtifactRepository(db).getById(c.req.param('id')!),
    NotFoundError('Artifact not found.'),
  );
  const project = ensureExists(
    await ProjectsRepository(db).getByIdRaw(artifact.projectId),
    NotFoundError('Artifact not found.'),
  );

  ensure(
    await ProjectsRepository(db).isWorkspaceMember(user.id, project.workspaceId),
    NotFoundError('Artifact not found.'),
  );

  c.set('artifact', artifact);
  await next();
};
