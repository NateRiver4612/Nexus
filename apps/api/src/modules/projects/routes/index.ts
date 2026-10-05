import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createProjectRoute } from './createProject';
import { deleteProjectRoute } from './deleteProject';
import { getProjectRoute } from './getProject';
import { listProjectsRoute } from './listProjects';
import { updateProjectRoute } from './updateProject';

export function projectRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: listProjectsRoute.route, handler: listProjectsRoute.handler },
    { route: createProjectRoute.route, handler: createProjectRoute.handler },
    { route: getProjectRoute.route, handler: getProjectRoute.handler },
    { route: updateProjectRoute.route, handler: updateProjectRoute.handler },
    { route: deleteProjectRoute.route, handler: deleteProjectRoute.handler },
  ] as const);
}
