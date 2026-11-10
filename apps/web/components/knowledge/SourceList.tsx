'use client';

import { useRef, useState } from 'react';
import type { KnowledgeSourceType } from '@nexus/types';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  useDeleteKnowledgeSource,
  useDeleteKnowledgeSources,
  useGetKnowledgeSources,
} from '@/hooks/useKnowledge';
import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fileIcon, formatBytes } from '../UploadKnowledgeSource';
import DeleteConfirmDialog from '../DeleteConfirmDialog';
import { Info, Trash2 } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const SourceListSkeleton = () => {
  return (
    <div className="space-y-2">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-6 shrink-0 rounded" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="size-5 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
};

export function SourceList({
  projectId,
  showEmptyText = true,
  onDelete,
  onlyView = false,
  selectable = false,
}: {
  projectId: string;
  showEmptyText?: boolean;
  onDelete?: () => void;
  onlyView?: boolean;
  /** Adds row checkboxes, select-all, and bulk deletion. */
  selectable?: boolean;
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const { mutate: deleteKnowledgeSources, isPending: isBulkDeleting } = useDeleteKnowledgeSources({
    onSuccess: () => {
      setBulkOpen(false);
      setBulkError(null);
      setSelectedIds(new Set());
    },
    onError: (err) => {
      setBulkError(err instanceof Error ? err.message : 'Could not delete sources.');
    },
  });

  const deletableSources = (sources ?? []).filter(
    (source) => source.status === 'ready' || source.status === 'failed',
  );
  const selectedSourceIds = deletableSources
    .filter((source) => selectedIds.has(source.id))
    .map((source) => source.id);
  const selectedCount = selectedSourceIds.length;
  const allSelected = deletableSources.length > 0 && selectedCount === deletableSources.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelection = ({ id, checked }: { id: string; checked: boolean }) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(deletableSources.map((source) => source.id)) : new Set());
  };

  const confirmBulkDelete = () => {
    if (selectedSourceIds.length === 0) return;
    setBulkError(null);
    deleteKnowledgeSources({ projectId, sourceIds: selectedSourceIds });
  };

  const deleteSource = (source: KnowledgeSourceType) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setError(null);

    deleteKnowledgeSource({ projectId, sourceId: source.id });
  };

  const confirmDelete = () => {
    if (!target) return;
    deleteSource(target);
  };

  if (isLoading) {
    return <SourceListSkeleton />;
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
      {selectable && (
        <div className="mb-2 flex items-center justify-between pl-3 gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-sources"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              disabled={deletableSources.length === 0 || isBulkDeleting}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
            <Label
              htmlFor="select-all-sources"
              className="text-sm font-normal text-muted-foreground"
            >
              Select all
            </Label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            // disabled={selectedCount === 0 || isBulkDeleting}
            onClick={() => {
              setBulkError(null);
              setBulkOpen(true);
            }}
            className={cn('text-destructive transition duration-300', {
              'cursor-not-allowed opacity-0': selectedCount === 0 || isBulkDeleting,
            })}
          >
            <Trash2 className="size-4" />
            Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border space-y-2">
        {sources.map((file) => {
          const isYouTube = file.sourceType === 'youtube';
          const isPending = file.status === 'pending' || file.status === 'processing';
          const isCompleted = file.status === 'ready';
          const isFailed = file.status === 'failed';
          const isDeletable = isCompleted || isFailed;

          const { icon, color } = fileIcon({
            name: file.name,
            type: file.mimeType ?? file.sourceType ?? 'txt',
          });

          return (
            <li
              key={`${file.id}`}
              aria-disabled={isPending || isFailed}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2',
                {
                  'bg-gray-100 animate-pulse': isPending,
                  'bg-destructive/4': isFailed,
                },
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {selectable && (
                  <Checkbox
                    checked={isDeletable ? selectedIds.has(file.id) : false}
                    disabled={!isDeletable || isBulkDeleting}
                    onCheckedChange={(checked) =>
                      toggleSelection({ id: file.id, checked: checked === true })
                    }
                    aria-label={`Select ${file.name}`}
                  />
                )}
                <span className={cn(color)}>
                  <FontAwesomeIcon icon={icon} color={color} size="xl" />
                </span>
                <div className="min-w-0 text-start">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn('text-sm text-gray-900 font-semibold', {
                        'text-destructive': isFailed,
                      })}
                    >
                      {isPending ? `Processing ${file.name}` : file.name}{' '}
                      {isFailed ? '(Failed)' : ''}
                    </p>
                    {isFailed && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 shrink-0 cursor-pointer text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {file.errorMessage ?? 'Invalid URL. Please check the URL and try again.'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {!isYouTube && (
                    <p
                      className={cn('text-xs text-muted-foreground', {
                        'text-destructive': isFailed,
                      })}
                    >
                      {formatBytes(file.size)}
                    </p>
                  )}
                </div>
              </div>
              <div>
                {!onlyView &&
                  (isCompleted || isFailed ? (
                    <Trash2
                      onClick={() => {
                        if (isFailed) {
                          // Failed sources are removed immediately — no
                          // confirmation needed since they contribute nothing.
                          deleteSource(file);
                        } else {
                          setError(null);
                          setTarget(file);
                        }
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

      {selectable && (
        <DeleteConfirmDialog
          open={bulkOpen}
          close={() => {
            setBulkOpen(false);
            setBulkError(null);
          }}
          confirmDelete={confirmBulkDelete}
          error={bulkError}
          isDeleting={isBulkDeleting}
          content={`Remove ${selectedCount} selected ${selectedCount === 1 ? 'source' : 'sources'}? The files are deleted from storage and their processed chunks are removed. This cannot be undone.`}
        />
      )}
    </>
  );
}
