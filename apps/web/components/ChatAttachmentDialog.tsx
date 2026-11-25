'use client';

import { useState } from 'react';
import type { ChatAttachmentType } from '@nexus/types';
import { Download } from 'lucide-react';

import { getAttachmentDownloadUrl } from '@/api/attachments';
import { FilePreview } from '@/components/FilePreview';
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
import { formatBytes } from './UploadKnowledgeSource';

export type ChatAttachmentTarget = ChatAttachmentType & { conversationId: string };

type ChatAttachmentDialogProps = {
  attachment: ChatAttachmentTarget | null;
  onClose: () => void;
};

/** Detail view for one chat file, sharing the artifact panel's preview renderers. */
export const ChatAttachmentDialog = ({ attachment, onClose }: ChatAttachmentDialogProps) => {
  const [downloading, setDownloading] = useState(false);
  const preview = useFilePreview({
    source: attachment
      ? {
          kind: 'attachment',
          conversationId: attachment.conversationId,
          attachmentId: attachment.id,
        }
      : null,
    mimeType: attachment?.mimeType ?? '',
    enabled: Boolean(attachment),
  });

  const download = async () => {
    if (!attachment || downloading) return;
    setDownloading(true);
    try {
      const { url } = await getAttachmentDownloadUrl(attachment.conversationId, attachment.id);
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noreferrer';
      link.click();
    } catch (error) {
      console.error('[attachment] download failed', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={Boolean(attachment)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{attachment?.name ?? 'Attachment'}</DialogTitle>
          {attachment && <DialogDescription>{formatBytes(attachment.size)}</DialogDescription>}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto pr-1">
          {attachment && (
            <FilePreview
              name={attachment.name}
              mimeType={attachment.mimeType}
              text={preview.text}
              objectUrl={preview.objectUrl}
              buffer={preview.buffer}
              isLoading={preview.isLoading}
              error={preview.error}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={download}
            isLoading={downloading}
            disabled={!attachment}
          >
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
