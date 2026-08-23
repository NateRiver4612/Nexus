import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createArtifactRoute } from './createArtifact';
import { deleteArtifactRoute } from './deleteArtifact';
import { listArtifactsRoute } from './listArtifacts';
import { updateArtifactRoute } from './updateArtifact';

export function artifactRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: listArtifactsRoute.route, handler: listArtifactsRoute.handler },
    { route: createArtifactRoute.route, handler: createArtifactRoute.handler },
    { route: updateArtifactRoute.route, handler: updateArtifactRoute.handler },
    { route: deleteArtifactRoute.route, handler: deleteArtifactRoute.handler },
  ] as const);
}
