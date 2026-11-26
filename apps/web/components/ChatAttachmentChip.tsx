'use client';

import { useEffect, useState } from 'react';
import { isThumbnailableMime } from '@nexus/shared-helpers';
import { Download, FileText, LoaderCircle, X } from 'lucide-react';

import { getAttachmentDownloadUrl } from '@/api/attachments';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilePreview } from '@/hooks/useFilePreview';
import { useThumbnailUrl } from '@/hooks/useThumbnailUrl';
import { cn, isAudioMime } from '@/lib/utils';
import { MediaThumbnail } from './MediaThumbnail';
import { AudioPlayer } from './preview/AudioPlayer';
import { formatBytes } from './UploadKnowledgeSource';

type ChatAttachmentChipProps = {
  name: string;
  mimeType: string;
  size: number;
  /** Draft state; omit for a file already attached to a sent message. */
  status?: 'uploading' | 'ready' | 'failed';
  errorMessage?: string | null;
  /** Needed to play/download the file before it is attached to a sent message. */
  conversationId?: string;
  attachmentId?: string;
  /** The local file for a draft upload, so an image preview is instant (before it's processed). */
  file?: File;
  /** Opens the detail dialog; omitted for files that can't be previewed yet. */
  onOpen?: () => void;
  onRemove?: () => void;
};

/** Uppercase file-type label for the card badge, e.g. `MD`; falls back to the mime subtype. */
const extensionOf = ({ name, mimeType }: { name: string; mimeType: string }) => {
  const ext = name.includes('.') ? name.split('.').pop() : undefined;
  return (ext ?? mimeType.split('/').pop() ?? 'FILE').toUpperCase();
};

/** Shimmer placeholder shown while a file uploads and is transcribed. */
export const ChatAttachmentCardSkeleton = () => (
  <div className="flex min-h-[7rem] w-40 flex-col gap-1.5 rounded-xl border border-border bg-background p-3">
    <Skeleton className="h-3.5 w-3/4" />
    <Skeleton className="h-3.5 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
    <div className="mt-auto">
      <Skeleton className="h-4 w-10 rounded-md" />
    </div>
  </div>
);

/** A file attached to a chat message, shown as a card in drafts and in the user bubble. */
export const ChatAttachmentChip = ({
  name,
  mimeType,
  size,
  status,
  errorMessage,
  conversationId,
  attachmentId,
  file,
  onOpen,
  onRemove,
}: ChatAttachmentChipProps) => {
  const [downloading, setDownloading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !mimeType.startsWith('image/')) {
      setLocalPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, mimeType]);

  const isAudio = isAudioMime(mimeType) && status !== 'failed';
  const isThumbnailable = isThumbnailableMime(mimeType) && status !== 'failed';
  const canLoadThumbnail =
    Boolean(conversationId && attachmentId) && status !== 'uploading' && status !== 'failed';
  const thumbnail = useThumbnailUrl({
    source:
      isThumbnailable && canLoadThumbnail && conversationId && attachmentId
        ? { kind: 'attachment', conversationId, attachmentId }
        : null,
    enabled: isThumbnailable && canLoadThumbnail && !localPreviewUrl,
  });
  const previewSrc = localPreviewUrl ?? thumbnail.data?.url ?? null;
  const canAccess = Boolean(conversationId && attachmentId);
  const audio = useFilePreview({
    source:
      isAudio && conversationId && attachmentId
        ? { kind: 'attachment', conversationId, attachmentId }
        : null,
    mimeType,
    enabled: isAudio && canAccess,
  });

  const detail =
    status === 'uploading'
      ? 'Uploading…'
      : status === 'failed'
        ? (errorMessage ?? 'Could not read the file.')
        : formatBytes(size);

  const download = async () => {
    if (!conversationId || !attachmentId || downloading) return;
    setDownloading(true);
    try {
      const { url } = await getAttachmentDownloadUrl(conversationId, attachmentId);
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

  if (isAudio) {
    return (
      <div className="relative flex w-64 flex-col gap-2 rounded-xl border border-border bg-background p-3 text-xs">
        <button
          type="button"
          disabled={!onOpen}
          onClick={onOpen}
          className={cn(
            'truncate pr-4 text-left font-medium',
            onOpen && 'cursor-pointer hover:underline',
          )}
        >
          {name}
        </button>

        {audio.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : audio.objectUrl ? (
          <AudioPlayer src={audio.objectUrl} />
        ) : (
          <p className="text-muted-foreground">{audio.error ?? detail}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {extensionOf({ name, mimeType })}
          </span>
          <button
            type="button"
            onClick={download}
            disabled={!canAccess || downloading}
            aria-label={`Download ${name}`}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {downloading ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="absolute top-1.5 right-1.5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-disabled={!onOpen}
      aria-label={onOpen ? `Open ${name}` : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      title={status === 'failed' ? (errorMessage ?? 'Upload failed') : name}
      className={cn(
        'relative flex min-h-[7rem] w-40 flex-col rounded-xl border border-border bg-background p-3 text-xs transition',
        onOpen ? 'cursor-pointer hover:shadow-md' : 'cursor-default',
        status === 'failed' && 'border-destructive/40 bg-destructive/5',
      )}
    >
      {isThumbnailable ? (
        <MediaThumbnail
          src={previewSrc}
          alt={name}
          isLoading={!localPreviewUrl && thumbnail.status === 'loading'}
          className="mb-1.5 h-20 w-full rounded-md bg-muted"
          fallback={<FileText className="size-6 text-muted-foreground" aria-hidden />}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className="line-clamp-2 pr-4 font-medium leading-snug break-words">{name}</span>
        <span
          className={cn(
            'line-clamp-2 break-words text-muted-foreground',
            status === 'failed' && 'text-destructive',
          )}
        >
          {detail}
        </span>
        <span className="flex justify-end items-center gap-1.5">
          <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {extensionOf({ name, mimeType })}
          </span>
          {status === 'uploading' && (
            <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          aria-label={`Remove ${name}`}
          className="absolute top-1.5 right-1.5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};
