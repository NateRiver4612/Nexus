import type {
  CreateTaskNoteInputType,
  TaskDetailType,
  TaskNoteListType,
  TaskNoteType,
  TaskStepStatusType,
  UpdateTaskInputType,
  UpdateTaskNoteInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getTask(taskId: string) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].$get({ param: { taskId } }),
  )) as TaskDetailType;
}

export async function updateTask({
  taskId,
  input,
}: {
  taskId: string;
  input: UpdateTaskInputType;
}) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].$patch({ param: { taskId }, json: input }),
  )) as TaskDetailType;
}

export async function updateTaskStepStatus({
  taskId,
  stepId,
  status,
}: {
  taskId: string;
  stepId: string;
  status: TaskStepStatusType;
}) {
  return handleResponse(
    await apiClient.api.v1.tasks[':taskId'].steps[':stepId'].$patch({
      param: { taskId, stepId },
      json: { status },
    }),
  );
}

export async function updateTaskDodStatus({
  taskId,
  dodId,
  status,
}: {
  taskId: string;
  dodId: string;
  status: TaskStepStatusType;
}) {
  return handleResponse(
    await apiClient.api.v1.tasks[':taskId'].dods[':dodId'].$patch({
      param: { taskId, dodId },
      json: { status },
    }),
  );
}

export async function completeTask(taskId: string) {
  return handleResponse(
    await apiClient.api.v1.tasks[':taskId'].complete.$patch({ param: { taskId } }),
  );
}

export async function getTaskNotes(taskId: string) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].notes.$get({ param: { taskId } }),
  )) as TaskNoteListType;
}

export async function getTaskNote({ taskId, noteId }: { taskId: string; noteId: string }) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].notes[':noteId'].$get({
      param: { taskId, noteId },
    }),
  )) as TaskNoteType;
}

export async function createTaskNote({
  taskId,
  input,
}: {
  taskId: string;
  input: CreateTaskNoteInputType;
}) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].notes.$post({ param: { taskId }, json: input }),
  )) as TaskNoteType;
}

export async function updateTaskNote({
  taskId,
  noteId,
  input,
}: {
  taskId: string;
  noteId: string;
  input: UpdateTaskNoteInputType;
}) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].notes[':noteId'].$patch({
      param: { taskId, noteId },
      json: input,
    }),
  )) as TaskNoteType;
}

export async function deleteTaskNote({ taskId, noteId }: { taskId: string; noteId: string }) {
  return (await handleResponse(
    await apiClient.api.v1.tasks[':taskId'].notes[':noteId'].$delete({
      param: { taskId, noteId },
    }),
  )) as TaskNoteType;
}
