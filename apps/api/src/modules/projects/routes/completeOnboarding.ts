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
  taskDods,
  taskSteps,
  tasks,
} from '@nexus/db';

import { requireOnboardingForProject } from '../middlewares';
import { getUser } from '../../../auth-middleware';
import { getOnboarding, getProject } from '../../../lib/hono-context';
import { toProjectCategory } from '../service';
import { calculateProjectProgress } from '../../milestones/progress';

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

            const createdTasks = await tx
              .insert(tasks)
              .values(
                milestone.tasks.map((task) => ({
                  projectId,
                  milestoneId: createdMilestone.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  difficulty: task.difficulty,
                  estimatedTimeMinutes: task.estimatedTimeMinutes ?? null,
                  position: task.position,
                  createdBy: user.id,
                })),
              )
              .returning();

            // Each task's draft steps become task_step rows (position = array order).
            const stepRows = createdTasks.flatMap((task, taskIndex) =>
              (milestone.tasks[taskIndex]?.steps ?? []).map((step, stepIndex) => ({
                taskId: task.id,
                value: step.value,
                position: stepIndex,
                status: step.status,
              })),
            );

            if (stepRows.length) {
              await tx.insert(taskSteps).values(stepRows);
            }

            // Each task's draft DoD criteria become task_dod rows (position = array order).
            const dodRows = createdTasks.flatMap((task, taskIndex) =>
              (milestone.tasks[taskIndex]?.dods ?? []).map((dod, dodIndex) => ({
                taskId: task.id,
                value: dod.value,
                position: dodIndex,
                status: dod.status,
              })),
            );

            if (dodRows.length) {
              await tx.insert(taskDods).values(dodRows);
            }

            return createdTasks;
          }),
        )
      ).flat();

      await tx
        .update(projectOnboarding)
        .set({
          status: 'completed',
          completedAt: new Date(),
          step: 5,
          updatedAt: new Date(),
        })
        .where(eq(projectOnboarding.id, onboardingId));

      await tx
        .update(projects)
        .set({
          name: stepData.step1.name,
          description: stepData.step1.description,
          category: toProjectCategory(stepData.step1.category),
          summary: plan.summary,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      if (newTasks[0]) {
        await tx.insert(projectProgress).values({
          projectId,
          currentTaskId: newTasks[0].id,
          progressPercentage: calculateProjectProgress(newTasks),
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
          category: onboardingProject.category,
          status: 'active' as const,
          createdAt: onboardingProject.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
        summary: plan.summary,
        milestones: plan.milestones,
      },
      200,
    );
  },
});
