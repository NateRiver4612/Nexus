'use client';

import { AssistantView } from '@/components/AIAssistantView';
import { useParams } from 'next/navigation';

export default function AssistantPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return <AssistantView projectId={projectId} />;
}
