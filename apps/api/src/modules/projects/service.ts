import { projectOnboarding, projects } from '@nexus/db';
import type {
  CreateProjectInputType,
  OnboardingStateType,
  ProjectType,
  UpdateOnboardingInputType,
} from '@nexus/types';

import { onboardingRepository, projectsRepository, type NewProjectRow } from './repository';

type ProjectRow = typeof projects.$inferSelect;
type OnboardingRow = typeof projectOnboarding.$inferSelect;

export function ProjectService() {
  return { create, get, list, update, remove, getOnboarding, saveOnboarding };
}

export async function create(
  userId: string,
  input: Pick<CreateProjectInputType, 'name' | 'slug' | 'description'>,
): Promise<ProjectType> {
  const workspace = await ensureWorkspace(userId);

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

export async function get(id: string): Promise<ProjectType | null> {
  const row = await projectsRepository.getById(id);
  return row ? toProjectView(row) : null;
}

export async function list(userId: string): Promise<ProjectType[]> {
  const workspace = await ensureWorkspace(userId);
  const rows = await projectsRepository.listByWorkspace(workspace.id);
  return rows.map(toProjectView);
}

export async function update(id: string, patch: Partial<NewProjectRow>) {
  const rows = await projectsRepository.update(id, patch);
  return rows[0] ? toProjectView(rows[0]) : null;
}

export async function remove(id: string) {
  await projectsRepository.remove(id);
}

export async function getOnboarding(userId: string): Promise<OnboardingStateType | null> {
  const row = await onboardingRepository.getForUser(userId);
  return row ? toOnboardingView(row) : null;
}

export async function saveOnboarding(
  userId: string,
  input: UpdateOnboardingInputType,
): Promise<OnboardingStateType> {
  const key = `step${input.step}`;
  const name = input.step === 1 ? (input.data as { name: string }).name : undefined;

  const existing = await onboardingRepository.getForUser(userId);
  if (existing) {
    const prev = (existing.stepData ?? {}) as Record<string, unknown>;
    const rows = await onboardingRepository.update(existing.id, {
      step: input.step,
      status: input.status ?? existing.status,
      name: name ?? existing.name,
      stepData: { ...prev, [key]: input.data },
    });
    return toOnboardingView(rows[0]!);
  }

  const workspace = await ensureWorkspace(userId);
  const rows = await onboardingRepository.create({
    userId,
    workspaceId: workspace.id,
    status: input.status ?? 'draft',
    name: name ?? '',
    step: input.step,
    stepData: { [key]: input.data },
  });
  return toOnboardingView(rows[0]!);
}

function toOnboardingView(row: OnboardingRow): OnboardingStateType {
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    step: row.step,
    stepData: (row.stepData ?? {}) as OnboardingStateType['stepData'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureWorkspace(userId: string) {
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
