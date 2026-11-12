import type { ChatArtifactType } from '@nexus/types';
import { FileText, Workflow } from 'lucide-react';

import { cn } from '@/lib/utils';

export const ARTIFACT_TYPE_LABELS: Record<ChatArtifactType['type'], string> = {
  report: 'Report',
  proposal: 'Proposal',
  document: 'Document',
  study_guide: 'Study guide',
  diagram: 'Diagram',
};

type ArtifactTypeIconProps = { type: ChatArtifactType['type']; className?: string };

export const ArtifactTypeIcon = ({ type, className }: ArtifactTypeIconProps) => {
  const Icon = type === 'diagram' ? Workflow : FileText;
  return <Icon className={className} />;
};

type ArtifactCardProps = {
  artifact: ChatArtifactType;
  onOpen?: (artifact: ChatArtifactType) => void;
};

export const ArtifactCard = ({ artifact, onOpen }: ArtifactCardProps) => {
  return (
    <button
      type="button"
      disabled={!onOpen}
      onClick={() => onOpen?.(artifact)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left',
        onOpen && 'cursor-pointer transition hover:bg-accent',
      )}
    >
      <ArtifactTypeIcon type={artifact.type} className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{artifact.name}</p>
        <p className="text-xs text-muted-foreground">
          {ARTIFACT_TYPE_LABELS[artifact.type]}
          {artifact.version > 1 ? ` · v${artifact.version}` : ''}
        </p>
      </div>
    </button>
  );
};
