'use client';

import type { KnowledgeSourceType } from '@nexus/types';

import { Markdown } from '@/components/Markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
};

export const SourcePreviewDialog = ({ source, open, onOpenChange }: SourcePreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{source?.name ?? 'Source'}</DialogTitle>
          {source && (
            <DialogDescription>
              {sourceTypeLabel[source.sourceType]}
              {source.sourceType !== 'youtube' ? ` · ${formatBytes(source.size)}` : ''}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {source?.content ? (
            <Markdown>{source.content}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">
              No preview is available for this source yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
