'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import TaskNotesSection from '@/components/task/TaskNotesSection';
import TaskSummarySection from '@/components/task/TaskSummarySection';
import { useDeleteTaskNote, useGetTask, useGetTaskNotes } from '@/hooks/useTasks';
import type { TaskNoteType } from '@nexus/types';

const page = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();

  const { data: task } = useGetTask({
    variables: taskId,
  });

  const { data: notes } = useGetTaskNotes({
    variables: taskId,
  });

  const [noteToDelete, setNoteToDelete] = useState<TaskNoteType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { mutate: deleteTaskNote, isPending: isDeleting } = useDeleteTaskNote({
    onSuccess: () => {
      setNoteToDelete(null);
      setDeleteError(null);
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the note.');
    },
  });

  if (!task) {
    return <></>;
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskSummarySection task={task}></TaskSummarySection>
      <TaskNotesSection
        notes={notes}
        onAddNote={() => router.push(`/tasks/${taskId}/note`)}
        onNoteClick={(note) => router.push(`/tasks/${taskId}/note/${note.id}`)}
        onDeleteNote={(note) => {
          setDeleteError(null);
          setNoteToDelete(note);
        }}
      ></TaskNotesSection>

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

export default page;
