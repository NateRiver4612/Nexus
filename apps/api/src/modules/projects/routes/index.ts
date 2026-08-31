import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createProjectRoute } from './createProject';
import { deleteProjectRoute } from './deleteProject';
import { getProjectRoute } from './getProject';
import { updateProjectRoute } from './updateProject';
import { getProjectsRoute } from './getProjects';

export function projectRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getProjectsRoute.route, handler: getProjectsRoute.handler },
    { route: createProjectRoute.route, handler: createProjectRoute.handler },
    { route: getProjectRoute.route, handler: getProjectRoute.handler },
    { route: updateProjectRoute.route, handler: updateProjectRoute.handler },
    { route: deleteProjectRoute.route, handler: deleteProjectRoute.handler },
  ] as const);
}
