import {
  completeTask,
  createTaskNote,
  deleteTaskNote,
  getTask,
  getTaskNote,
  getTaskNotes,
  reopenTask,
  updateTask,
  updateTaskDodStatus,
  updateTaskNote,
  updateTaskStepStatus,
} from '@/api/tasks';

import { milestoneKeys, projectKeys, taskKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';

/** Shared invalidation after a task status change: the task, its milestone list, and the project detail (progress + current task). */
function invalidateTaskSurfaces(
  queryClient: import('@tanstack/react-query').QueryClient,
  taskId: string,
  projectId?: string,
) {
  queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: milestoneKeys.list(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  }
}

export const useGetTask = createDetailQueryHook(getTask, (taskId) => taskKeys.detail(taskId));

export const useUpdateTask = createMutationHook(updateTask, (queryClient) => ({
  onSuccess: (task, variables) => {
    // The task detail response carries the projectId (derived per the API flow),
    // so a status change can refresh the milestones view and the project detail
    // (whose `currentTask` drives the "Current task" card).
    invalidateTaskSurfaces(queryClient, variables.taskId, task?.project?.id);
  },
}));

export const useUpdateTaskStepStatus = createMutationHook(updateTaskStepStatus, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) }),
}));

export const useUpdateTaskDodStatus = createMutationHook(updateTaskDodStatus, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) }),
}));

export const useCompleteTask = createMutationHook(completeTask, (queryClient) => ({
  onSuccess: (task, taskId) => invalidateTaskSurfaces(queryClient, taskId, task?.project?.id),
}));

export const useReopenTask = createMutationHook(reopenTask, (queryClient) => ({
  onSuccess: (task, taskId) => invalidateTaskSurfaces(queryClient, taskId, task?.project?.id),
}));

export const useGetTaskNotes = createDetailQueryHook(getTaskNotes, (taskId) =>
  taskKeys.notes(taskId),
);

export const useGetTaskNote = createDetailQueryHook(getTaskNote, ({ taskId, noteId }) =>
  taskKeys.note(taskId, noteId),
);

export const useCreateTaskNote = createMutationHook(createTaskNote, (queryClient) => ({
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
  },
}));

export const useUpdateTaskNote = createMutationHook(updateTaskNote, (queryClient) => ({
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
  },
}));

export const useDeleteTaskNote = createMutationHook(deleteTaskNote, (queryClient) => ({
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
  },
}));
