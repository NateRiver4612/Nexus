import { and, eq, sql } from 'drizzle-orm';

import {
  milestones,
  projectProgress,
  projects,
  taskDods,
  taskSteps,
  tasks,
  users,
  type Db,
  type TaskStepStatus,
} from '@nexus/db';
import type {
  MilestoneType,
  ProjectType,
  TaskDodType,
  TaskStepType,
  UpdateTaskInputType,
  UserType,
} from '@nexus/types';

/**
 * Task columns matched to the DTO keys; the FK rows are nested as JSON with
 * explicit camelCase keys (`json_build_object`), because `to_jsonb` would emit
 * the raw snake_case column names and break the camelCase zod schemas.
 */
const taskDetailFields = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  difficulty: tasks.difficulty,
  estimatedTimeMinutes: tasks.estimatedTimeMinutes,
  position: tasks.position,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  steps: sql<TaskStepType[]>`
    coalesce(
      (
        select jsonb_agg(
          json_build_object(
            'id', ${taskSteps.id},
            'taskId', ${taskSteps.taskId},
            'value', ${taskSteps.value},
            'position', ${taskSteps.position},
            'status', ${taskSteps.status},
            'createdAt', ${taskSteps.createdAt},
            'updatedAt', ${taskSteps.updatedAt}
          )
          order by ${taskSteps.position}
        )
        from ${taskSteps}
        where ${taskSteps.taskId} = ${tasks.id}
      ),
      '[]'::jsonb
    )
  `,
  dods: sql<TaskDodType[]>`
    coalesce(
      (
        select jsonb_agg(
          json_build_object(
            'id', ${taskDods.id},
            'taskId', ${taskDods.taskId},
            'value', ${taskDods.value},
            'position', ${taskDods.position},
            'status', ${taskDods.status},
            'createdAt', ${taskDods.createdAt},
            'updatedAt', ${taskDods.updatedAt}
          )
          order by ${taskDods.position}
        )
        from ${taskDods}
        where ${taskDods.taskId} = ${tasks.id}
      ),
      '[]'::jsonb
    )
  `,
  milestone: sql<MilestoneType | null>`
    case
      when ${milestones.id} is null then null
      else json_build_object(
        'id', ${milestones.id},
        'projectId', ${milestones.projectId},
        'title', ${milestones.title},
        'description', ${milestones.description},
        'position', ${milestones.position},
        'status', ${milestones.status},
        'createdAt', ${milestones.createdAt},
        'updatedAt', ${milestones.updatedAt}
      )
    end
  `,
  project: sql<ProjectType>`
    json_build_object(
      'id', ${projects.id},
      'name', ${projects.name},
      'slug', ${projects.slug},
      'description', ${projects.description},
      'category', ${projects.category},
      'status', ${projects.status},
      'createdAt', ${projects.createdAt},
      'updatedAt', ${projects.updatedAt}
    )
  `,
  createdBy: sql<UserType>`
    json_build_object(
      'id', ${users.id},
      'email', ${users.email},
      'name', ${users.name},
      'image', ${users.image}
    )
  `,
};

export const TaskRepository = (db: Db) => ({
  /** Bare task row — used by the access middleware to resolve task → project. */
  async getById(id: string) {
    const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return rows[0];
  },

  /** Task with its resolved milestone, project, and creator — one query. */
  async getByIdWithDetails(id: string) {
    const rows = await db
      .select(taskDetailFields)
      .from(tasks)
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(users, eq(tasks.createdBy, users.id))
      .where(eq(tasks.id, id))
      .limit(1);
    return rows[0];
  },

  /** Rewrites one step's status — scoped to the task so foreign ids are a no-op. */
  updateStepStatus(taskId: string, stepId: string, status: TaskStepStatus) {
    return db
      .update(taskSteps)
      .set({ status: status, updatedAt: new Date() })
      .where(and(eq(taskSteps.id, stepId), eq(taskSteps.taskId, taskId)))
      .returning();
  },

  /** Generic scalar-field update on the task row — scoped by id. */
  update(taskId: string, patch: UpdateTaskInputType) {
    return db
      .update(tasks)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
  },

  /** Points the project's `currentTaskId` at this task (it became the active one). */
  setCurrentTask(projectId: string, taskId: string) {
    return db
      .update(projectProgress)
      .set({ currentTaskId: taskId, updatedAt: new Date() })
      .where(eq(projectProgress.projectId, projectId));
  },

  /** Rewrites one DoD item's status — scoped to the task so foreign ids are a no-op. */
  updateDodStatus(taskId: string, dodId: string, status: TaskStepStatus) {
    return db
      .update(taskDods)
      .set({ status: status, updatedAt: new Date() })
      .where(and(eq(taskDods.id, dodId), eq(taskDods.taskId, taskId)))
      .returning();
  },

  /** Lists a task's DoD items in order — used by the complete gate. */
  listDods(taskId: string) {
    return db
      .select({ id: taskDods.id, status: taskDods.status })
      .from(taskDods)
      .where(eq(taskDods.taskId, taskId))
      .orderBy(taskDods.position);
  },

  /** Completes the task — called only after the DoD gate passes. */
  completeTask(taskId: string) {
    return db
      .update(tasks)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
  },
});

/** Resolved row shape of the task-detail query. */
export type TaskDetailRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof TaskRepository>['getByIdWithDetails']>>
>;
