'use client';

import TaskNoteEditor from '@/components/task/TaskNoteEditor';
import { useParams, useRouter } from 'next/navigation';

const page = () => {
  const { taskId, noteId } = useParams<{ taskId: string; noteId: string }>();
  const router = useRouter();

  if (!taskId || !noteId) {
    return <></>;
  }

  return (
    <TaskNoteEditor
      taskId={taskId}
      noteId={noteId}
      onDeleted={() => router.push(`/tasks/${taskId}/overview`)}
    />
  );
};

export default page;