import type { MiddlewareHandler } from 'hono';
import { getUser } from '../../auth-middleware';
import { getDb } from '@nexus/db';
import { OnboardingService } from './service';
import { OnboardingRepository, ProjectsRepository } from './repository';
import { HttpError } from '../../errors';
import type { OnboardingDataType } from '@nexus/types';

/** Every step must be present before we can generate a plan. */
const REQUIRED_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

/**
 * Guards `POST /:projectId/submit`. Loads the user's onboarding and makes
 * sure all steps are complete (no null/undefined step data); only then
 * does it expose the fully-typed step data to the handler via `getOnboarding(c)`.
 */
export const requireCompleteOnboarding: MiddlewareHandler = async (c, next) => {
  const user = getUser(c);
  const db = getDb();

  const onboarding = await OnboardingService(db).getOnboarding(user.id);
  const stepData = onboarding?.stepData;

  if (!onboarding || !stepData) {
    throw HttpError.validation('Onboarding has not been started yet.');
  }

  for (const step of REQUIRED_STEPS) {
    if (stepData[step] == null) {
      throw HttpError.validation(`Onboarding step ${step} is missing. Complete all steps first.`);
    }
  }

  c.set('onboarding', stepData as OnboardingDataType);
  await next();
};

/**
 * Guards onboarding routes that are scoped to a single project (e.g. complete).
 * Validates the onboarding belongs to the user AND the `projectId` path param,
 * reuses the step-completeness check, loads the (possibly `draft`) project,
 * then exposes both via `getOnboarding(c)` and `getProject(c)`.
 *
 * Reads path params via `c.req.param()` — route middleware runs before the
 * zValidator middleware, so `c.req.valid()` is not available here.
 */
export const requireOnboardingForProject: MiddlewareHandler = async (c, next) => {
  const user = getUser(c);
  const db = getDb();

  const projectId = c.req.param('projectId')!;
  const onboardingId = c.req.param('onboardingId')!;

  const onboarding = await OnboardingRepository(db).getById(onboardingId);

  if (!onboarding || onboarding.userId !== user.id || onboarding.projectId !== projectId) {
    throw HttpError.notFound('Onboarding not found for this project.');
  }

  const stepData = (onboarding.stepData ?? {}) as Record<string, unknown>;
  for (const step of REQUIRED_STEPS) {
    if (stepData[step] == null) {
      throw HttpError.validation(`Onboarding step ${step} is missing. Complete all steps first.`);
    }
  }

  const project = await ProjectsRepository(db).getByIdRaw(projectId);
  if (!project) {
    throw HttpError.notFound('Project not found.');
  }

  c.set('onboarding', stepData as OnboardingDataType);
  c.set('project', project);
  await next();
};

export const requireProjectAccess: MiddlewareHandler = async (c, next) => {
  const user = getUser(c);
  const db = getDb();

  const projectId = c.req.param('projectId')!;

  const project = await ProjectsRepository(db).getByIdRaw(projectId);
  if (!project) {
    throw HttpError.notFound('Project not found.');
  }

  const isMember = await ProjectsRepository(db).isWorkspaceMember(user.id, project.workspaceId);
  if (!isMember) {
    throw HttpError.notFound('Project not found.');
  }

  c.set('project', project);
  await next();
};
