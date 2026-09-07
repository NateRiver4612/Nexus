import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  onboardingStateSchema,
  updateOnboardingSchema,
} from '@nexus/zod-schemas';

import { getUser } from '../../../auth-middleware';
import { saveOnboarding } from '../service';

export const saveOnboardingRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/onboarding',
    request: {
      body: {
        content: {
          'application/json': { schema: updateOnboardingSchema },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: onboardingStateSchema } },
        description: 'Onboarding progress updated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Invalid onboarding step data',
      },
    },
  }),
  handler: async (c) => {
    const user = getUser(c);
    const body = c.req.valid('json');

    const state = await saveOnboarding(user.id, body);
    return c.json(state, 200);
  },
});
