'use client';

import { useParams } from 'next/navigation';

import { AddSources } from '@/components/knowledge/AddSources';
import { SourceList } from '@/components/knowledge/SourceList';

export default function KnowledgePage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Knowledge</h1>
      <div className="rounded-xl border-border bg-card p-6">
        <h2 className="mb-4 text-sm text-muted-foreground">Add sources</h2>
        <AddSources projectId={projectId} />
      </div>
      <div className="rounded-xl border-border bg-card p-6">
        <h2 className="mb-4 text-sm text-muted-foreground">Sources</h2>
        <SourceList projectId={projectId} />
      </div>
    </div>
  );
}
