'use client';

import { useState } from 'react';
import type { ChatArtifactType } from '@nexus/types';
import { Code, Download, FileText, Loader2, Workflow } from 'lucide-react';

import { getArtifactContent } from '@/api/artifacts';
import { Skeleton } from '@/components/ui/skeleton';
import { artifactFilename, cn, downloadTextFile } from '@/lib/utils';

export const ARTIFACT_TYPE_LABELS: Record<ChatArtifactType['type'], string> = {
  report: 'Report',
  proposal: 'Proposal',
  document: 'Document',
  study_guide: 'Study guide',
  diagram: 'Diagram',
  code: 'Code',
};

/** `.md`/`.mmd` filenames decide the label/icon, even if the model saved a different `type`. */
export function displayArtifactType({ name, type }: ChatArtifactType): ChatArtifactType['type'] {
  if (/\.(mmd|mermaid)$/i.test(name)) return 'diagram';
  if (/\.(md|markdown)$/i.test(name)) return 'document';
  return type;
}

type ArtifactTypeIconProps = { type: ChatArtifactType['type']; className?: string };

export const ArtifactTypeIcon = ({ type, className }: ArtifactTypeIconProps) => {
  const Icon = type === 'diagram' ? Workflow : type === 'code' ? Code : FileText;
  return <Icon className={className} />;
};

/** Placeholder shown in the reply while `create_artifact` is running. */
export const ArtifactCardSkeleton = () => (
  <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
    <Skeleton className="size-5 shrink-0 rounded-md" />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-3 w-1/5" />
    </div>
  </div>
);

type ArtifactCardProps = {
  artifact: ChatArtifactType;
  onOpen?: (artifact: ChatArtifactType) => void;
};

export const ArtifactCard = ({ artifact, onOpen }: ArtifactCardProps) => {
  const [downloading, setDownloading] = useState(false);
  const displayType = displayArtifactType(artifact);

  // Fetched on demand — rendering a card shouldn't load every artifact's content.
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const data = await getArtifactContent({ id: artifact.id, version: artifact.version });
      downloadTextFile({
        filename: artifactFilename(artifact.name, data.mimeType),
        content: data.content,
        mimeType: data.mimeType,
      });
    } catch (error) {
      console.error('[artifact] download failed', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3',
        onOpen && 'transition hover:bg-accent',
      )}
    >
      <button
        type="button"
        disabled={!onOpen}
        onClick={() => onOpen?.(artifact)}
        className={cn('flex min-w-0 flex-1 items-center gap-3 text-left', onOpen && 'cursor-pointer')}
      >
        <ArtifactTypeIcon type={displayType} className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{artifact.name}</p>
          <p className="text-xs text-muted-foreground">
            {ARTIFACT_TYPE_LABELS[displayType]}
            {artifact.version > 1 ? ` · v${artifact.version}` : ''}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        aria-label="Download artifact"
        className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition hover:bg-accent disabled:opacity-50"
      >
        {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      </button>
    </div>
  );
};
