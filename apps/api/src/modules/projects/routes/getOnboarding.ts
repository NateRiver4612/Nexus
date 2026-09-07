import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, onboardingStateSchema } from '@nexus/zod-schemas';

import { getUser } from '../../../auth-middleware';
import { HttpError } from '../../../errors';
import { getOnboarding } from '../service';

export const getOnboardingRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/onboarding',
    responses: {
      200: {
        content: { 'application/json': { schema: onboardingStateSchema } },
        description: 'Onboarding progress retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Onboarding not found',
      },
    },
  }),
  handler: async (c) => {
    const user = getUser(c);
    const onboarding = await getOnboarding(user.id);
    if (!onboarding) throw HttpError.notFound('Onboarding not found');
    return c.json(onboarding, 200);
  },
});
