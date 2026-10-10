import { projectOnboarding, projects, type Db } from '@nexus/db';
import type {
  CreateProjectInputType,
  OnboardingStateType,
  ProjectCategoryType,
  ProjectDetailType,
  ProjectType,
  UpdateOnboardingInputType,
} from '@nexus/types';
import { projectCategoryEnum, kickoffSummarySchema } from '@nexus/zod-schemas';

import { HttpError } from '../../errors';
import {
  OnboardingRepository,
  ProjectsRepository,
  type NewProjectRow,
  type ProjectDetailsRow,
} from './repository';

type ProjectRow = typeof projects.$inferSelect;
type OnboardingRow = typeof projectOnboarding.$inferSelect;

export function ProjectService(db: Db) {
  const projectsRepository = ProjectsRepository(db);

  async function create(
    userId: string,
    input: Pick<CreateProjectInputType, 'name' | 'slug' | 'description' | 'status' | 'category'>,
  ): Promise<ProjectType> {
    const workspace = await ensureWorkspace(db, userId);

    const rows = await projectsRepository.create({
      workspaceId: workspace.id,
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description ?? null,
      status: input.status ?? 'draft',
      createdBy: userId,
    });

    const project = rows[0]!;

    await projectsRepository.addProjectMember({
      projectId: project.id,
      userId,
      role: 'owner',
    });

    return toProjectView(project);
  }

  async function get(id: string): Promise<ProjectDetailType | null> {
    const row = await projectsRepository.getByIdWithDetails(id);
    return row ? toProjectDetailView(row) : null;
  }

  async function list(userId: string): Promise<ProjectDetailType[]> {
    const workspace = await ensureWorkspace(db, userId);

    const rows = await projectsRepository.listByWorkspace(workspace.id);
    return rows.map(toProjectDetailView);
  }

  async function update(id: string, patch: Partial<NewProjectRow>) {
    const rows = await projectsRepository.update(id, patch);
    return rows[0] ? toProjectView(rows[0]) : null;
  }

  async function remove(id: string) {
    await projectsRepository.remove(id);
  }

  return { create, get, list, update, remove };
}

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

      const existing = await onboardingRepository.getByUserId(userId);

      if (existing) {
        assertOnboardingOrder(existing, input.step);

        let projectId = existing.projectId;

        if (step === 1) {
          await txProjectService.update(projectId, {
            name: step1Data.name,
            slug: slugify(step1Data.name),
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
        slug: slugify(step1Data.name),
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

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

/** Resolve a step-1 category to the strict projects.category enum. "Other"/custom
 * values aren't supported yet (AI category support comes later) — reject them. */
export function toProjectCategory(value: string): ProjectCategoryType {
  const parsed = projectCategoryEnum.safeParse(value);
  if (!parsed.success) {
    throw HttpError.validation(
      `Category "${value}" is not supported yet. Pick one of: ${projectCategoryEnum.options.join(', ')}.`,
    );
  }
  return parsed.data;
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
    if (!stepData[`step${required}`]) {
      throw HttpError.validation(`Complete step ${required} before continuing.`);
    }
  }
}

async function ensureWorkspace(db: Db, userId: string) {
  const projectsRepository = ProjectsRepository(db);

  const existing = await projectsRepository.findWorkspaceForUser(userId);
  if (existing) {
    return { id: existing.workspaceId };
  }
  const [workspace] = await projectsRepository.createWorkspace({
    name: 'Personal',
    slug: 'personal',
    createdBy: userId,
  });
  if (!workspace) throw new Error('failed to create workspace');
  await projectsRepository.addWorkspaceMember({
    workspaceId: workspace.id,
    userId,
    role: 'owner',
  });
  return { id: workspace.id };
}

function toProjectView(row: ProjectRow): ProjectType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProjectDetailView(row: ProjectDetailsRow): ProjectDetailType {
  // AI output is validated at the read boundary — summary is jsonb from the LLM.
  const summary = row.summary ? kickoffSummarySchema.safeParse(row.summary) : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    summary: summary?.success ? summary.data : null,
    category: row.category,
    status: row.status === 'archived' ? 'archived' : 'active',
    progressPercentage: row.progressPercentage,
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
    currentTask: row.currentTask,
    numOfTasks: row.numOfTasks,
    numOfCompletedTasks: row.numOfCompletedTasks,
    numOfMilestones: row.numOfMilestones,
    numOfArtifacts: row.numOfArtifacts,
    numOfDeliverables: row.numOfDeliverables,
    numOfKnowledgeSources: row.numOfKnowledgeSources,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
