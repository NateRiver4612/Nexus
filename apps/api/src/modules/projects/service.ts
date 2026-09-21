import { projectOnboarding, projects, type Db } from '@nexus/db';
import type {
  CreateProjectInputType,
  OnboardingStateType,
  ProjectDetailType,
  ProjectType,
  UpdateOnboardingInputType,
} from '@nexus/types';

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
    input: Pick<CreateProjectInputType, 'name' | 'slug' | 'description' | 'status'>,
  ): Promise<ProjectType> {
    const workspace = await ensureWorkspace(db, userId);

    const rows = await projectsRepository.create({
      workspaceId: workspace.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      status: 'active',
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
    const key = `step${input.step}`;

    const existing = await onboardingRepository.getByUserId(userId);

    if (existing) {
      assertOnboardingOrder(existing, input.step);
      let projectId = existing.projectId;

      const prev = (existing.stepData ?? {}) as Record<string, unknown>;

      const updatedOnboarding = await onboardingRepository.update(existing.id, {
        step: input.step,
        projectId,
        status: 'in_progress',
        stepData: { ...prev, [key]: input.data },
      });
      return toOnboardingView(updatedOnboarding!);
    }

    const workspace = await ensureWorkspace(db, userId);

    const step1Data = input.data as {
      name: string;
      description?: string | null | undefined;
      category: string;
    };

    const createdOnboarding = await db.transaction(async (tx) => {
      const txProjectService = ProjectService(tx);
      const txOnboardingRepository = OnboardingRepository(tx);

      const project = await txProjectService.create(userId, {
        name: step1Data.name,
        slug: slugify(step1Data.name),
        description: step1Data.description ?? null,
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
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProjectDetailView(row: ProjectDetailsRow): ProjectDetailType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
    currentTask: row.currentTask,
    numOfTasks: row.numOfTasks,
    numOfCompletedTasks: row.numOfCompletedTasks,
    numOfMilestones: row.numOfMilestones,
    numOfArtifacts: row.numOfArtifacts,
    numOfDeliverables: row.numOfDeliverables,
    numOfKnowledgeSources: row.numOfKnowledgeSources,
  };
}
