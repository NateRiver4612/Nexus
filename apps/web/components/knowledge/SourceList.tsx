'use client';

import { useRef, useState } from 'react';
import type { KnowledgeSourceType } from '@nexus/types';

import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteKnowledgeSource, useGetKnowledgeSources } from '@/hooks/useKnowledge';
import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fileIcon, formatBytes } from '../UploadKnowledgeSource';
import DeleteConfirmDialog from '../DeleteConfirmDialog';
import { Trash2 } from 'lucide-react';
import { Spinner } from '../ui/spinner';

export function SourceList({
  projectId,
  showEmptyText = true,
  onDelete,
  onlyView = false,
}: {
  projectId: string;
  showEmptyText?: boolean;
  onDelete?: () => void;
  onlyView?: boolean;
}) {
  const { data: sources, isLoading } = useGetKnowledgeSources({ variables: projectId });

  const { mutateAsync: deleteKnowledgeSource, isPending: isDeleting } = useDeleteKnowledgeSource({
    onSuccess: () => {
      deletingRef.current = false;
      onDelete?.();
      setTarget(null);
    },
    onError: (err) => {
      deletingRef.current = false;
      setError(err instanceof Error ? err.message : 'Could not delete source.');
    },
  });

  const [target, setTarget] = useState<KnowledgeSourceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deletingRef = useRef(false);

  const confirmDelete = () => {
    if (!target || deletingRef.current) return;
    deletingRef.current = true;
    setError(null);

    deleteKnowledgeSource({ projectId, sourceId: target.id });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!sources?.length) {
    if (!showEmptyText) {
      return null;
    }

    return (
      <p className="py-6 text-center text-sx text-muted-foreground">
        No sources yet. Add files, links, or copied text to build your knowledge base.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border space-y-2">
        {sources.map((file) => {
          const isYouTube = file.sourceType === 'youtube';
          const isPending = file.status === 'pending' || file.status === 'processing';
          const isCompleted = file.status === 'ready';

          const { icon, color } = fileIcon({
            name: file.name,
            type: file.mimeType ?? file.sourceType ?? 'txt',
          });

          return (
            <li
              key={`${file.id}`}
              aria-disabled={isPending}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2',
                {
                  'bg-gray-100 animate-pulse': isPending,
                },
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn(color)}>
                  <FontAwesomeIcon icon={icon} color={color} size="xl" />
                </span>
                <div className="min-w-0 text-start">
                  <p className=" text-sm text-gray-900 font-semibold">
                    {isPending ? `Processing ${file.name}` : file.name}
                  </p>
                  {!isYouTube && (
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  )}
                </div>
              </div>
              <div>
                {!onlyView &&
                  (isCompleted ? (
                    <Trash2
                      onClick={() => {
                        setError(null);
                        setTarget(file);
                      }}
                      strokeWidth={2}
                      className="size-5 cursor-pointer! text-destructive"
                    />
                  ) : (
                    <Spinner></Spinner>
                  ))}
              </div>

              <DeleteConfirmDialog
                open={file.id === target?.id}
                close={() => setTarget(null)}
                confirmDelete={confirmDelete}
                error={error}
                isDeleting={isDeleting}
                content={`Remove “${target?.name || target?.sourceRef}”? The file is deleted from storage and its processed chunks are removed. This cannot be undone.
                `}
              ></DeleteConfirmDialog>
            </li>
          );
        })}
      </ul>
    </>
  );
}
