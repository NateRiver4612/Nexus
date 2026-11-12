import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createArtifactRoute } from './createArtifact';
import { deleteArtifactRoute } from './deleteArtifact';
import { getArtifactContentRoute } from './getArtifactContent';
import { getArtifactsRoute } from './getArtifacts';
import { updateArtifactRoute } from './updateArtifact';

export function artifactRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getArtifactsRoute.route, handler: getArtifactsRoute.handler },
    { route: createArtifactRoute.route, handler: createArtifactRoute.handler },
    { route: getArtifactContentRoute.route, handler: getArtifactContentRoute.handler },
    { route: updateArtifactRoute.route, handler: updateArtifactRoute.handler },
    { route: deleteArtifactRoute.route, handler: deleteArtifactRoute.handler },
  ] as const);
}
