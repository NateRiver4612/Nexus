'use client';

import { LoaderCircle, X } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatBytes } from './UploadKnowledgeSource';

type ChatAttachmentChipProps = {
  name: string;
  mimeType: string;
  size: number;
  /** Draft state; omit for a file already attached to a sent message. */
  status?: 'uploading' | 'ready' | 'failed';
  errorMessage?: string | null;
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
  onRemove,
}: ChatAttachmentChipProps) => {
  const detail =
    status === 'uploading'
      ? 'Uploading…'
      : status === 'failed'
        ? (errorMessage ?? 'Could not read the file.')
        : formatBytes(size);

  return (
    <div
      title={status === 'failed' ? (errorMessage ?? 'Upload failed') : name}
      className={cn(
        'relative flex min-h-[7rem] w-40 flex-col gap-1.5 rounded-xl border border-border bg-background p-3 text-xs',
        status === 'failed' && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <span className="line-clamp-3 pr-4 font-medium leading-snug break-words">{name}</span>
      <span
        className={cn(
          'line-clamp-2 break-words text-muted-foreground',
          status === 'failed' && 'text-destructive',
        )}
      >
        {detail}
      </span>
      <div className="mt-auto flex items-center gap-1.5 pt-0.5">
        <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {extensionOf({ name, mimeType })}
        </span>
        {status === 'uploading' && (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
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
};
