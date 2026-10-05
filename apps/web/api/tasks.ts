import type { TaskDetailType, TaskStepStatusType, UpdateTaskInputType } from '@nexus/types';

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
