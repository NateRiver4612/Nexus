'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { TaskNoteType } from '@nexus/types';

import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import TaskActionBar from '@/components/task/TaskActionBar';
import TaskBreadcrumb from '@/components/task/TaskBreadcrumb';
import { TaskNoteEditorSkeleton } from '@/components/task/TaskNoteEditor';
import TaskSidebar from '@/components/task/TaskSidebar';
import TaskSummarySection, {
  TaskSummarySectionSkeleton,
} from '@/components/task/TaskSummarySection';
import TaskWorkbench from '@/components/task/TaskWorkbench';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteTaskNote, useGetTask, useGetTaskNotes } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

const TaskPageHeaderSkeleton = () => {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      {/* Breadcrumb */}
      <div className="flex w-fit max-w-full min-w-0 shrink-0 items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 shadow-2xs">
        <Skeleton className="hidden h-3 w-24 sm:block" />
        <Skeleton className="hidden size-3.5 rounded-full sm:block" />
        <Skeleton className="h-6 w-24 shrink-0 rounded-pill" />
        <Skeleton className="h-4 min-w-0 flex-1 sm:w-40" />
        <div className="flex shrink-0 items-center gap-0.5">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="size-7 rounded-full" />
        </div>
      </div>

      {/* Timer + complete action */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 shadow-2xs">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-pill" />
      </div>
    </div>
  );
};

const TaskSidebarSkeleton = () => {
  return (
    <div className="flex min-h-full flex-col gap-4">
      {/* Active Mission */}
      <Card className="relative space-y-4 overflow-hidden rounded-card bg-accent p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-pill bg-accent-foreground/15" />
            <Skeleton className="h-3 w-28 bg-accent-foreground/15" />
          </div>
          <Skeleton className="size-9 rounded-pill bg-accent-foreground/15" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-14 rounded-pill bg-accent-foreground/15" />
          <Skeleton className="h-6 w-24 rounded-pill bg-accent-foreground/15" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-4/5 bg-accent-foreground/15" />
          <Skeleton className="h-4 w-full bg-accent-foreground/15" />
          <Skeleton className="h-4 w-2/3 bg-accent-foreground/15" />
        </div>
      </Card>

      {/* Execution Momentum */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-16 rounded-pill" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-7 w-16 rounded-pill" />
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <Skeleton className="h-8 w-24 rounded-pill" />
        </div>
        <div className="space-y-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-item" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-item" />
        <Skeleton className="mt-auto h-16 w-full rounded-item" />
      </Card>
    </div>
  );
};

const TaskPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto lg:h-[calc(100%+2rem)] lg:-mb-8 lg:overflow-hidden">
      <TaskPageHeaderSkeleton />

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25fr)_minmax(0,55fr)_minmax(0,25fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,6fr)_minmax(0,2fr)]">
        <div className="no-scrollbar min-h-0 pb-5 lg:overflow-y-auto lg:pr-1">
          <TaskSidebarSkeleton />
        </div>

        <div className="min-h-[70vh] pb-5 lg:min-h-0 lg:overflow-hidden">
          <Card className="relative h-full min-h-[70vh] overflow-hidden p-0 lg:min-h-0">
            <TaskNoteEditorSkeleton headerEnd={<Skeleton className="h-8 w-48 rounded-pill" />} />
          </Card>
        </div>

        <div className="no-scrollbar min-h-0 flex flex-col gap-4 pb-5 lg:overflow-y-auto lg:pr-1">
          <TaskSummarySectionSkeleton />
        </div>
      </div>
    </div>
  );
};

const TaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [loggedMinutes, setLoggedMinutes] = useState(0);
  const [noteToDelete, setNoteToDelete] = useState<TaskNoteType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: task, isLoading } = useGetTask({ variables: taskId });
  const { data: notes, isLoading: isNotesLoading } = useGetTaskNotes({ variables: taskId });

  const noteParam = searchParams.get('noteId');
  // `?noteId=new` is the explicit blank-note state; with no param we default to the first note.
  const activeNoteId =
    noteParam === 'new'
      ? undefined
      : noteParam && notes?.some((note) => note.id === noteParam)
        ? noteParam
        : notes?.[0]?.id;

  const showNote = (noteId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (noteId) {
      params.set('noteId', noteId);
    } else {
      params.delete('noteId');
    }

    const query = params.toString();
    router.replace(query ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`);
  };

  const { mutate: deleteTaskNote, isPending: isDeleting } = useDeleteTaskNote({
    onSuccess: () => {
      setNoteToDelete(null);
      setDeleteError(null);
      showNote();
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the note.');
    },
  });

  if (isLoading) {
    return <TaskPageSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <p className="rounded-card border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Task not found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto lg:h-[calc(100%+2rem)] lg:-mb-8 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <TaskBreadcrumb task={task} />
        <TaskActionBar task={task} onLoggedMinutesChange={setLoggedMinutes} />
      </div>

      <div
        className={cn(
          'grid gap-4 lg:min-h-0 lg:flex-1',
          isSidebarCollapsed
            ? isRightCollapsed
              ? 'lg:grid-cols-[56px_minmax(0,1fr)_56px] 2xl:grid-cols-[56px_minmax(0,1fr)_56px]'
              : 'lg:grid-cols-[56px_minmax(0,55fr)_minmax(0,25fr)] 2xl:grid-cols-[56px_minmax(0,6fr)_minmax(0,2fr)]'
            : isRightCollapsed
              ? 'lg:grid-cols-[minmax(0,25fr)_minmax(0,75fr)_56px] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,4fr)_56px]'
              : 'lg:grid-cols-[minmax(0,25fr)_minmax(0,55fr)_minmax(0,25fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,6fr)_minmax(0,2fr)]',
        )}
      >
        <div className="no-scrollbar pb-5 min-h-0 lg:overflow-y-auto lg:pr-1">
          <TaskSidebar
            task={task}
            notes={notes}
            isNotesLoading={isNotesLoading}
            selectedNoteId={activeNoteId ?? null}
            onSelectNote={(note) => showNote(note.id)}
            onAddNote={() => showNote('new')}
            onDeleteNote={(note) => {
              setDeleteError(null);
              setNoteToDelete(note);
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapsed={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            loggedMinutes={loggedMinutes}
          />
        </div>

        <div className="min-h-[70vh] pb-5 lg:min-h-0 lg:overflow-hidden">
          <TaskWorkbench
            taskId={task.id}
            projectId={task.project.id}
            noteId={activeNoteId}
            onNoteCreated={showNote}
            onNoteDeleted={() => showNote()}
            onNewNote={() => showNote('new')}
            className="lg:h-full"
          />
        </div>

        <div
          className={cn(
            'min-h-0 pb-5',
            isRightCollapsed
              ? 'flex'
              : 'no-scrollbar flex flex-col gap-4 lg:overflow-y-auto lg:pr-1',
          )}
        >
          <TaskSummarySection
            task={task}
            isCollapsed={isRightCollapsed}
            onToggleCollapse={() => setIsRightCollapsed((collapsed) => !collapsed)}
          />
        </div>
      </div>

      {noteToDelete && (
        <DeleteConfirmDialog
          open={!!noteToDelete}
          close={() => setNoteToDelete(null)}
          confirmDelete={() => deleteTaskNote({ taskId, noteId: noteToDelete.id })}
          error={deleteError}
          isDeleting={isDeleting}
          requiredText={noteToDelete.title}
          content="This note will be permanently deleted and cannot be undone."
        />
      )}
    </div>
  );
};

export default TaskDetailPage;
