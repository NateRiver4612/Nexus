import { OpenAPIHono } from '@hono/zod-openapi';

import { assignDeliverablesRoute } from './assignDeliverables';
import { completeProjectOnboardingRoute } from './completeOnboarding';
import { createProjectRoute } from './createProject';
import { deleteDeliverableRoute } from './deleteDeliverable';
import { deleteProjectRoute } from './deleteProject';
import { getOnboardingRoute } from './getOnboarding';
import { getProjectRoute } from './getProject';
import { getProjectDeliverablesRoute } from './getProjectDeliverables';
import { getProjectMilestonesRoute } from '../../milestones/routes/getMilestones';
import { updateProjectMilestonePositionsRoute } from '../../milestones/routes/updateMilestonePositions';
import { getProjectsRoute } from './getProjects';
import { removeDeliverableRoute } from './removeDeliverable';
import { submitProjectOnboardingRoute } from './submitOnboarding';
import { saveOnboardingRoute } from './saveOnboarding';
import { updateProjectRoute } from './updateProject';
import { requireAuth } from '../../../auth-middleware';
import { requireProjectAccess } from '../middlewares';

export function projectRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);

  app.use('/projects/:projectId/*', requireProjectAccess);
  app.use('/projects/:projectId', requireProjectAccess);

  return app.openapiRoutes([
    { route: getOnboardingRoute.route, handler: getOnboardingRoute.handler },
    { route: saveOnboardingRoute.route, handler: saveOnboardingRoute.handler },
    {
      route: submitProjectOnboardingRoute.route,
      handler: submitProjectOnboardingRoute.handler,
    },
    {
      route: completeProjectOnboardingRoute.route,
      handler: completeProjectOnboardingRoute.handler,
    },
    { route: getProjectDeliverablesRoute.route, handler: getProjectDeliverablesRoute.handler },
    { route: getProjectMilestonesRoute.route, handler: getProjectMilestonesRoute.handler },
    {
      route: updateProjectMilestonePositionsRoute.route,
      handler: updateProjectMilestonePositionsRoute.handler,
    },
    { route: assignDeliverablesRoute.route, handler: assignDeliverablesRoute.handler },
    { route: removeDeliverableRoute.route, handler: removeDeliverableRoute.handler },
    { route: deleteDeliverableRoute.route, handler: deleteDeliverableRoute.handler },
    { route: getProjectsRoute.route, handler: getProjectsRoute.handler },
    { route: createProjectRoute.route, handler: createProjectRoute.handler },
    { route: getProjectRoute.route, handler: getProjectRoute.handler },
    { route: updateProjectRoute.route, handler: updateProjectRoute.handler },
    { route: deleteProjectRoute.route, handler: deleteProjectRoute.handler },
  ] as const);
}
