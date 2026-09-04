import { OpenAPIHono } from '@hono/zod-openapi';

import { createProjectRoute } from './createProject';
import { deleteProjectRoute } from './deleteProject';
import { getOnboardingRoute } from './getOnboarding';
import { getProjectRoute } from './getProject';
import { getProjectsRoute } from './getProjects';
import { saveOnboardingRoute } from './saveOnboarding';
import { updateProjectRoute } from './updateProject';

export function projectRoutes() {
  const app = new OpenAPIHono();
  // app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getOnboardingRoute.route, handler: getOnboardingRoute.handler },
    { route: saveOnboardingRoute.route, handler: saveOnboardingRoute.handler },
    { route: getProjectsRoute.route, handler: getProjectsRoute.handler },
    { route: createProjectRoute.route, handler: createProjectRoute.handler },
    { route: getProjectRoute.route, handler: getProjectRoute.handler },
    { route: updateProjectRoute.route, handler: updateProjectRoute.handler },
    { route: deleteProjectRoute.route, handler: deleteProjectRoute.handler },
  ] as const);
}
