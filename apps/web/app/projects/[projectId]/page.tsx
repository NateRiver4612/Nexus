import { redirect } from 'next/navigation';
import { use } from 'react';

export default function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  redirect(`/projects/${projectId}/overview`);
}
