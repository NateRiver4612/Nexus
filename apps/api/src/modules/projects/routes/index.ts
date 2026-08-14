import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { createProjectRoute } from './createProject';
import { deleteProjectRoute } from './deleteProject';
import { getProjectRoute } from './getProject';
import { listProjectsRoute } from './listProjects';
import { updateProjectRoute } from './updateProject';

export function projectRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(listProjectsRoute.route, listProjectsRoute.handler);
  app.openapi(createProjectRoute.route, createProjectRoute.handler);
  app.openapi(getProjectRoute.route, getProjectRoute.handler);
  app.openapi(updateProjectRoute.route, updateProjectRoute.handler);
  app.openapi(deleteProjectRoute.route, deleteProjectRoute.handler);

  return app;
}
