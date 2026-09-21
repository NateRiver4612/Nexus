import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import {
  completeOnboardingSchema,
  errorResponseSchema,
  kickoffPlanSchema,
  projectOnboardingParamsSchema,
} from '@nexus/zod-schemas';
import {
  getDb,
  deliverablesProjectsAssignment,
  milestones,
  projectOnboarding,
  projectProgress,
  projects,
  tasks,
} from '@nexus/db';

import { requireOnboardingForProject } from '../middlewares';
import { getUser } from '../../../auth-middleware';
import { getOnboarding, getProject } from '../../../lib/hono-context';

export const completeProjectOnboardingRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/:projectId/onboarding/:onboardingId/complete',
    request: {
      params: projectOnboardingParamsSchema,
      body: {
        content: { 'application/json': { schema: kickoffPlanSchema } },
      },
    },
    middleware: [requireOnboardingForProject],
    responses: {
      200: {
        content: { 'application/json': { schema: completeOnboardingSchema } },
        description: 'Project with its joined plan',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Plan validation failed',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Onboarding or project not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, onboardingId } = c.req.valid('param');
    const plan = c.req.valid('json');

    const user = getUser(c);
    const db = getDb();
    const onboardingProject = getProject(c);
    const stepData = getOnboarding(c);

    await db.transaction(async (tx) => {
      const newTasks = (
        await Promise.all(
          plan.milestones.map(async (milestone) => {
            const [createdMilestone] = await tx
              .insert(milestones)
              .values({
                projectId,
                title: milestone.title,
                description: milestone.description,
                position: milestone.position,
                status: milestone.status,
              })
              .returning();

            if (!milestone.tasks.length || !createdMilestone) return [];

            return tx
              .insert(tasks)
              .values(
                milestone.tasks.map((task) => ({
                  projectId,
                  milestoneId: createdMilestone.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                  position: task.position,
                  createdBy: user.id,
                })),
              )
              .returning();
          }),
        )
      ).flat();

      await tx
        .update(projectOnboarding)
        .set({ status: 'completed', step: 5, updatedAt: new Date() })
        .where(eq(projectOnboarding.id, onboardingId));

      await tx
        .update(projects)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      if (newTasks[0]) {
        await tx.insert(projectProgress).values({
          projectId,
          currentTaskId: newTasks[0].id,
        });
      }

      const deliverableIds = (stepData.step4?.deliverables ?? []).map(
        (deliverable) => deliverable.id,
      );
      if (deliverableIds.length) {
        await tx
          .insert(deliverablesProjectsAssignment)
          .values(
            deliverableIds.map((deliverableId) => ({
              deliverableId,
              projectId,
            })),
          )
          .onConflictDoNothing({
            target: [
              deliverablesProjectsAssignment.deliverableId,
              deliverablesProjectsAssignment.projectId,
            ],
          });
      }
    });

    return c.json(
      {
        project: {
          id: onboardingProject.id,
          name: onboardingProject.name,
          slug: onboardingProject.slug,
          description: onboardingProject.description,
          status: 'active' as const,
          createdAt: onboardingProject.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
        milestones: plan.milestones,
      },
      200,
    );
  },
});
