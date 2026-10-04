import {
  completeTask,
  createTaskNote,
  deleteTaskNote,
  getTask,
  getTaskNote,
  getTaskNotes,
  updateTask,
  updateTaskDodStatus,
  updateTaskNote,
  updateTaskStepStatus,
} from '@/api/tasks';

import { milestoneKeys, taskKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';

export const useGetTask = createDetailQueryHook(getTask, (taskId) => taskKeys.detail(taskId));

export const useUpdateTask = createMutationHook(updateTask, (queryClient) => ({
  onSuccess: (task, variables) => {
    // The task detail response carries the projectId (derived per the API flow),
    // so a status change can refresh the milestones view that renders the task.
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    if (task?.project?.id) {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(task.project.id) });
    }
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
  onSuccess: (_, taskId) => queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
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
