import { projects, workspaceMembers, type Db } from '@nexus/db';
import type { CreateProjectInputType, ProjectDetailType, ProjectType } from '@nexus/types';
import { kickoffSummarySchema } from '@nexus/zod-schemas';
import { eq, isNull, and } from 'drizzle-orm';

import { ensureExists, NotFoundError } from '../../errors';
import { ProjectsRepository, type NewProjectRow, type ProjectDetailsRow } from './repository';

type ProjectRow = typeof projects.$inferSelect;

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

export async function ensureWorkspace(db: Db, userId: string) {
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

export async function assertProjectAccess(db: Db, userId: string, projectId: string) {
  const rows = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, projects.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  return ensureExists(rows[0], NotFoundError('Project not found'));
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

export type ProjectServiceType = ReturnType<typeof ProjectService>;
