import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectOnboardingParamsSchema,
  submitOnboardingOutputSchema,
} from '@nexus/zod-schemas';

import { requireCompleteOnboarding, requireOnboardingForProject } from '../middlewares';
import { getOnboarding, getUser } from '../../../lib/hono-context';
import { aiRuns, getDb, projectOnboarding } from '@nexus/db';
import { AI_QUEUE_KICKOFF, enqueueAI } from '../../ai/queues';
import { modelForTask } from '../../../lib/client';
import { eq } from 'drizzle-orm';

export const submitProjectOnboardingRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/:projectId/onboarding/:onboardingId/submit',
    request: {
      params: projectOnboardingParamsSchema,
    },
    middleware: [requireOnboardingForProject, requireCompleteOnboarding],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: submitOnboardingOutputSchema,
          },
        },
        description: 'Generated onboarding plan',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Onboarding is incomplete',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Onboarding failed to generate',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, onboardingId } = c.req.valid('param');

    const user = getUser(c);
    const stepData = getOnboarding(c);

    const db = getDb();

    const aiRun = await db.transaction(async (tx) => {
      const [aiRun] = await tx
        .insert(aiRuns)
        .values({
          projectId,
          userId: user.id,
          aiTask: AI_QUEUE_KICKOFF,
          model: modelForTask(AI_QUEUE_KICKOFF),
          status: 'queued',
        })
        .returning();

      if (!aiRun) {
        throw new Error('Failed to insert new AI run');
      }

      await tx
        .update(projectOnboarding)
        .set({
          aiRun: aiRun?.id!,
          status: 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(projectOnboarding.id, onboardingId));

      await enqueueAI({
        name: AI_QUEUE_KICKOFF,
        data: stepData,
        projectId,
        jobId: aiRun?.id!,
      });

      return aiRun;
    });

    return c.json(
      {
        runId: aiRun?.id!,
      },
      200,
    );
  },
});
