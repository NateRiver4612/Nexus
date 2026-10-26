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
import { toastError } from '@/lib/toast';
import { toast } from 'sonner';

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
  onSuccess: (res, variables) => {
    // The task detail response carries the projectId (derived per the API flow),
    // so a status change can refresh the milestones view and the project detail
    // (whose `currentTask` drives the "Current task" card).
    invalidateTaskSurfaces(queryClient, variables.taskId, res.data?.project?.id);
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useUpdateTaskStepStatus = createMutationHook(updateTaskStepStatus, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useUpdateTaskDodStatus = createMutationHook(updateTaskDodStatus, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useCompleteTask = createMutationHook(completeTask, (queryClient) => ({
  onSuccess: (res, taskId) => {
    invalidateTaskSurfaces(queryClient, taskId, res.data?.project?.id);
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useReopenTask = createMutationHook(reopenTask, (queryClient) => ({
  onSuccess: (res, taskId) => {
    invalidateTaskSurfaces(queryClient, taskId, res.data?.project?.id);
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useGetTaskNotes = createDetailQueryHook(getTaskNotes, (taskId) =>
  taskKeys.notes(taskId),
);

export const useGetTaskNote = createDetailQueryHook(getTaskNote, ({ taskId, noteId }) =>
  taskKeys.note(taskId, noteId),
);

export const useCreateTaskNote = createMutationHook(createTaskNote, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useUpdateTaskNote = createMutationHook(updateTaskNote, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useDeleteTaskNote = createMutationHook(deleteTaskNote, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.notes(variables.taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    toast.success(res.message);
  },
  onError: toastError,
}));
