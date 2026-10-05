import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, onboardingStateSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { OnboardingService } from '../service';

export const getOnboardingRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/onboarding',
    responses: {
      200: {
        content: { 'application/json': { schema: onboardingStateSchema.nullable() } },
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

    const db = getDb();
    const onboardingService = OnboardingService(db);

    const onboarding = await onboardingService.getOnboarding(user.id);

    if (!onboarding) {
      return c.json(null, 200);
    }

    return c.json(onboarding, 200);
  },
});
