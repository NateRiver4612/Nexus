'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

const page = ({ params }: { params: Promise<{ taskId: string }> }) => {
  const { taskId } = use(params);
  redirect(`/tasks/${taskId}/overview`);
};

export default page;
