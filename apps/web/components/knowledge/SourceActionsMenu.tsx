'use client';

import { Download, EllipsisVertical, Eye, SquareArrowOutUpRight, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SourceActionsMenuProps = {
  canPreview: boolean;
  canDownload: boolean;
  canOpenOriginal: boolean;
  canDelete: boolean;
  sourceRef: string | null;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
};

export const SourceActionsMenu = ({
  canPreview,
  canDownload,
  canOpenOriginal,
  canDelete,
  sourceRef,
  onPreview,
  onDownload,
  onDelete,
}: SourceActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Source actions"
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground"
        >
          <EllipsisVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card">
        <DropdownMenuItem
          disabled={!canPreview}
          onSelect={onPreview}
          className="cursor-pointer gap-2 px-2 py-1.5"
        >
          <Eye className="size-4" strokeWidth={1.6} />
          Preview
        </DropdownMenuItem>
        {canDownload && (
          <DropdownMenuItem onSelect={onDownload} className="cursor-pointer gap-2 px-2 py-1.5">
            <Download className="size-4" strokeWidth={1.6} />
            Download original
          </DropdownMenuItem>
        )}
        {canOpenOriginal && sourceRef && (
          <DropdownMenuItem asChild className="cursor-pointer gap-2 px-2 py-1.5">
            <a href={sourceRef} target="_blank" rel="noopener noreferrer">
              <SquareArrowOutUpRight className="size-4" strokeWidth={1.6} />
              Open original
            </a>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={onDelete}
              className="cursor-pointer gap-2 px-2 py-1.5"
            >
              <Trash2 className="size-4" strokeWidth={1.6} />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
