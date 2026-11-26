'use client';

import { useState } from 'react';
import type { ArtifactRefType } from '@nexus/types';
import {
  Code,
  Download,
  File,
  FileText,
  Image,
  Loader2,
  Music,
  Presentation,
  Table,
  Video,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { getArtifactDownloadUrl } from '@/api/artifacts';
import { Skeleton } from '@/components/ui/skeleton';
import { useThumbnailUrl } from '@/hooks/useThumbnailUrl';
import { cn } from '@/lib/utils';
import { MediaThumbnail } from './MediaThumbnail';

export const ARTIFACT_TYPE_LABELS: Record<ArtifactRefType['type'], string> = {
  report: 'Report',
  proposal: 'Proposal',
  document: 'Document',
  study_guide: 'Study guide',
  diagram: 'Diagram',
  code: 'Code',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  pdf: 'PDF',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  file: 'File',
};

/**
 * Only artifacts backed by an uploaded file have a stored thumbnail (the attachment path
 * generates it). AI-generated text artifacts intentionally stay icon-only.
 */
const THUMBNAIL_ARTIFACT_TYPES = new Set<ArtifactRefType['type']>([
  'image',
  'pdf',
  'document',
  'spreadsheet',
]);

const ARTIFACT_TYPE_ICONS: Record<ArtifactRefType['type'], LucideIcon> = {
  report: FileText,
  proposal: FileText,
  document: FileText,
  study_guide: FileText,
  diagram: Workflow,
  code: Code,
  spreadsheet: Table,
  presentation: Presentation,
  pdf: FileText,
  image: Image,
  audio: Music,
  video: Video,
  file: File,
};

/** `.md`/`.mmd` filenames decide the label/icon, even if the model saved a different `type`. */
export function displayArtifactType({ name, type }: ArtifactRefType): ArtifactRefType['type'] {
  if (/\.(mmd|mermaid)$/i.test(name)) return 'diagram';
  if (/\.(md|markdown)$/i.test(name)) return 'document';
  return type;
}

type ArtifactTypeIconProps = { type: ArtifactRefType['type']; className?: string };

export const ArtifactTypeIcon = ({ type, className }: ArtifactTypeIconProps) => {
  const Icon = ARTIFACT_TYPE_ICONS[type];
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
  artifact: ArtifactRefType;
  onOpen?: (artifact: ArtifactRefType) => void;
};

export const ArtifactCard = ({ artifact, onOpen }: ArtifactCardProps) => {
  const [downloading, setDownloading] = useState(false);
  const displayType = displayArtifactType(artifact);
  const thumbnail = useThumbnailUrl({
    source: { kind: 'artifact', artifactId: artifact.id, version: artifact.version },
    enabled: THUMBNAIL_ARTIFACT_TYPES.has(displayType),
  });

  // Presigned URL on demand — rendering a card shouldn't load every artifact's bytes.
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { url } = await getArtifactDownloadUrl({
        id: artifact.id,
        version: artifact.version,
      });
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noreferrer';
      link.click();
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
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 text-left',
          onOpen && 'cursor-pointer',
        )}
      >
        <MediaThumbnail
          src={thumbnail.data?.url}
          alt={artifact.name}
          isLoading={thumbnail.status === 'loading'}
          className="size-10 rounded-md bg-muted"
          fallback={
            <ArtifactTypeIcon type={displayType} className="size-5 text-muted-foreground" />
          }
        />
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
        className="shrink-0 cursor-pointer rounded-control p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-50"
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </button>
    </div>
  );
};
