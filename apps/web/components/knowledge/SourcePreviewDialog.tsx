'use client';

import type { KnowledgeSourceType } from '@nexus/types';
import { Download } from 'lucide-react';

import { FilePreview } from '@/components/FilePreview';
import { Markdown } from '@/components/Markdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFilePreview } from '@/hooks/useFilePreview';
import { formatBytes } from '../UploadKnowledgeSource';

const sourceTypeLabel: Record<KnowledgeSourceType['sourceType'], string> = {
  file: 'File',
  url: 'Link',
  youtube: 'YouTube',
  copied_text: 'Copied text',
  audio: 'Audio',
  video: 'Video',
};

type SourcePreviewDialogProps = {
  source: KnowledgeSourceType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Downloads the original stored file; omitted when the source has no bytes. */
  onDownload?: () => void;
};

export const SourcePreviewDialog = ({
  source,
  open,
  onOpenChange,
  onDownload,
}: SourcePreviewDialogProps) => {
  // Only storage-backed sources (files/audio) have raw bytes to preview. Links, YouTube,
  // and copied text fall back to their extracted content below.
  const hasStoredFile = Boolean(source?.storageKey);
  const preview = useFilePreview({
    source:
      source && hasStoredFile
        ? { kind: 'knowledge', projectId: source.projectId, sourceId: source.id }
        : null,
    mimeType: source?.mimeType ?? '',
    enabled: hasStoredFile,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{source?.name ?? 'Source'}</DialogTitle>
          {source && (
            <DialogDescription>
              {sourceTypeLabel[source.sourceType]}
              {source.sourceType !== 'youtube' ? ` · ${formatBytes(source.size)}` : ''}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto pr-1">
          {source && hasStoredFile ? (
            <FilePreview
              name={source.name}
              mimeType={preview.mimeType || (source.mimeType ?? 'application/octet-stream')}
              text={preview.text}
              objectUrl={preview.objectUrl}
              buffer={preview.buffer}
              isLoading={preview.isLoading}
              error={preview.error}
            />
          ) : source?.content ? (
            <Markdown>{source.content}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">
              No preview is available for this source yet.
            </p>
          )}
        </div>

        {hasStoredFile && onDownload && (
          <DialogFooter>
            <Button variant="outline" onClick={onDownload}>
              <Download className="size-4" />
              Download
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
