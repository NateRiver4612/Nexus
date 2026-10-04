'use client';

import TaskNoteEditor from '@/components/task/TaskNoteEditor';
import { useParams, useRouter } from 'next/navigation';

const page = () => {
  const router = useRouter();

  const { taskId } = useParams<{ taskId: string }>();

  const handleCreated = (noteId: string) => {
    router.push(`/tasks/${taskId}/note/${noteId}`);
  };

  if (!taskId) {
    return <></>;
  }

  return <TaskNoteEditor taskId={taskId} onCreated={handleCreated} />;
};

export default page;
