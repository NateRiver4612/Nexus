import type { Db, TaskStepStatus, TaskNote } from '@nexus/db';
import type {
  TaskDetailType,
  TaskNoteType,
  UpdateTaskInputType,
  CreateTaskNoteInputType,
  UpdateTaskNoteInputType,
} from '@nexus/types';

import { TaskRepository, type TaskDetailRow } from './repository';

export function TaskService(db: Db) {
  const repository = TaskRepository(db);

  async function getDetail(id: string): Promise<TaskDetailType | undefined> {
    const row = await repository.getByIdWithDetails(id);
    return row ? toDetailView(row) : undefined;
  }

  /**
   * Generic scalar-field update. When `status` is set to `in_progress`, the
   * task is also made the project's current task (`project_progress.currentTaskId`)
   * in the same transaction — both columns say "this is the task being worked on".
   */
  async function update(
    id: string,
    input: UpdateTaskInputType,
  ): Promise<TaskDetailType | undefined> {
    const task = await repository.getById(id);
    if (!task) return undefined;

    await db.transaction(async (tx) => {
      const txRepository = TaskRepository(tx);
      await txRepository.update(id, input);

      if (input.status === 'in_progress') {
        await txRepository.setCurrentTask(task.projectId, id);
      }
    });

    return getDetail(id);
  }

  async function listNotes(taskId: string): Promise<TaskNoteType[]> {
    const rows = await repository.listNotes(taskId);
    return rows.map(toNoteView);
  }

  async function getNote(taskId: string, noteId: string): Promise<TaskNoteType | undefined> {
    const row = await repository.getNote(taskId, noteId);
    return row ? toNoteView(row) : undefined;
  }

  async function createNote(
    taskId: string,
    input: CreateTaskNoteInputType,
  ): Promise<TaskNoteType | undefined> {
    const row = await repository.createNote(taskId, {
      title: input.title,
      content: input.content,
      contentText: input.contentText ?? null,
    });
    return row ? toNoteView(row) : undefined;
  }

  async function updateNote(
    taskId: string,
    noteId: string,
    input: UpdateTaskNoteInputType,
  ): Promise<TaskNoteType | undefined> {
    const rows = await repository.updateNote(taskId, noteId, {
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.content != null ? { content: input.content } : {}),
      ...(input.contentText != null ? { contentText: input.contentText } : {}),
    });
    const row = rows[0];
    return row ? toNoteView(row) : undefined;
  }

  async function deleteNote(taskId: string, noteId: string): Promise<TaskNoteType | undefined> {
    const rows = await repository.deleteNote(taskId, noteId);
    const row = rows[0];
    return row ? toNoteView(row) : undefined;
  }

  return { getDetail, update, listNotes, getNote, createNote, updateNote, deleteNote };
}

function toNoteView(row: TaskNote): TaskNoteType {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    content: row.content,
    contentText: row.contentText,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Simple-count progress: percentage of completed DoD items over total.
 * Completion is gated on the DoD, not the steps — so progress follows the DoD.
 * Returns an integer 0-100 (0 when there are no DoD items yet).
 */
function calculateDodProgress(dods: Array<{ status: TaskStepStatus }>): number {
  if (dods.length === 0) return 0;

  const completed = dods.filter((dod) => dod.status === 'completed').length;
  return Math.min(100, Math.round((completed / dods.length) * 100));
}

/**
 * Task columns map row → string; the FK rows arrive as `to_jsonb` objects whose
 * timestamps are already ISO strings, so they pass through to the DTO.
 */
function toDetailView(row: TaskDetailRow): TaskDetailType {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    difficulty: row.difficulty,
    estimatedTimeMinutes: row.estimatedTimeMinutes,
    steps: row.steps,
    dods: row.dods,
    progress: calculateDodProgress(row.dods),
    position: row.position,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    milestone: row.milestone,
    project: row.project,
  };
}
