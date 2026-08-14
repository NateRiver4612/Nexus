import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { createArtifactRoute } from './createArtifact';
import { deleteArtifactRoute } from './deleteArtifact';
import { listArtifactsRoute } from './listArtifacts';
import { updateArtifactRoute } from './updateArtifact';

export function artifactRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(listArtifactsRoute.route, listArtifactsRoute.handler);
  app.openapi(createArtifactRoute.route, createArtifactRoute.handler);
  app.openapi(updateArtifactRoute.route, updateArtifactRoute.handler);
  app.openapi(deleteArtifactRoute.route, deleteArtifactRoute.handler);

  return app;
}