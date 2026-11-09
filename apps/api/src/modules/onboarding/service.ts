import { projectOnboarding, type Db } from '@nexus/db';
import type { OnboardingStateType, UpdateOnboardingInputType } from '@nexus/types';
import { slugify } from '@nexus/shared-helpers';

import { ensure, ValidationError } from '../../errors';
import { toProjectCategory } from '../../helpers';
import { ensureWorkspace, ProjectService } from '../projects/service';
import { OnboardingRepository } from './repository';

type OnboardingRow = typeof projectOnboarding.$inferSelect;

export const OnboardingService = (db: Db) => {
  const onboardingRepository = OnboardingRepository(db);

  async function getOnboarding(userId: string): Promise<OnboardingStateType | null> {
    const row = await onboardingRepository.getByUserId(userId);
    return row ? toOnboardingView(row) : null;
  }

  async function saveOnboarding({
    userId,
    input,
  }: {
    userId: string;
    input: UpdateOnboardingInputType;
  }): Promise<OnboardingStateType> {
    const step = input.step;

    const key = `step${step}`;

    const step1Data = input.data as {
      name: string;
      description?: string | null | undefined;
      category: string;
    };

    const createdOnboarding = await db.transaction(async (tx) => {
      const txProjectService = ProjectService(tx);
      const txOnboardingRepository = OnboardingRepository(tx);

      const workspace = await ensureWorkspace(tx, userId);

      const existing = await txOnboardingRepository.getByUserId(userId);

      if (existing) {
        assertOnboardingOrder(existing, input.step);

        const projectId = existing.projectId;

        if (step === 1) {
          await txProjectService.update(projectId, {
            name: step1Data.name,
            slug: slugify(step1Data.name) || 'project',
            description: step1Data.description ?? null,
            category: toProjectCategory(step1Data.category),
          });
        }

        const prev = (existing.stepData ?? {}) as Record<string, unknown>;

        const updatedOnboarding = await txOnboardingRepository.update(existing.id, {
          step: input.step,
          projectId,
          status: 'in_progress',
          stepData: { ...prev, [key]: input.data },
        });

        return updatedOnboarding!;
      }

      const project = await txProjectService.create(userId, {
        name: step1Data.name,
        slug: slugify(step1Data.name) || 'project',
        description: step1Data.description ?? null,
        category: toProjectCategory(step1Data.category),
        status: 'draft',
      });

      const createdOnboarding = await txOnboardingRepository.create({
        userId,
        workspaceId: workspace.id,
        projectId: project.id,
        step: input.step,
        status: 'in_progress',
        stepData: { [key]: input.data },
      });

      return createdOnboarding;
    });

    return toOnboardingView(createdOnboarding!);
  }

  return {
    getOnboarding,
    saveOnboarding,
  };
};

function toOnboardingView(row: OnboardingRow): OnboardingStateType {
  return {
    id: row.id,
    status: row.status,
    step: row.step,
    projectId: row.projectId,
    aiRunId: row.aiRun,
    stepData: (row.stepData ?? {}) as OnboardingStateType['stepData'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A step may only be saved once every earlier step's data exists in stepData. */
const stepPrerequisites: Record<number, number[]> = {
  2: [1],
  3: [1, 2],
  4: [1, 2, 3],
};

function assertOnboardingOrder(existing: OnboardingRow, step: number) {
  const stepData = (existing.stepData ?? {}) as Record<string, unknown>;

  for (const required of stepPrerequisites[step] ?? []) {
    ensure(
      stepData[`step${required}`] != null,
      ValidationError(`Complete step ${required} before continuing.`),
    );
  }
}

export type OnboardingServiceType = ReturnType<typeof OnboardingService>;
