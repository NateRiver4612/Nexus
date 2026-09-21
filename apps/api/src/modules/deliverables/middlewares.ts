import type { MiddlewareHandler } from 'hono';
import { getDb } from '@nexus/db';
import { HttpError } from '../../errors';
import { DeliverableRepository } from './repository';

/**
 * Guards hard-deletes of deliverables (`DELETE …/:deliverableId/delete`).
 * Only project-owned custom deliverables may be deleted from the catalog —
 * shared presets never are. Exposes the row via `getDeliverable(c)`.
 *
 * Reads path params via `c.req.param()` — route middleware runs before the
 * zValidator middleware, so `c.req.valid()` is not available here.
 */
export const requireCustomDeliverable: MiddlewareHandler = async (c, next) => {
  const db = getDb();

  const projectId = c.req.param('projectId')!;
  const deliverableId = c.req.param('deliverableId')!;

  const deliverable = await DeliverableRepository(db).getById(deliverableId);

  if (!deliverable) {
    throw HttpError.notFound('Deliverable not found.');
  }

  if (!deliverable.isCustom || deliverable.projectId !== projectId) {
    throw HttpError.validation('Only custom deliverables created in this project can be deleted.');
  }

  c.set('deliverable', deliverable);
  await next();
};
