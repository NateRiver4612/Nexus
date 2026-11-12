'use client';

import { Download, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AIConversationActionsMenuProps = {
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export const AIConversationActionsMenu = ({
  onDownload,
  onRename,
  onDelete,
}: AIConversationActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  const selectDownload = () => {
    setOpen(false);
    onDownload();
  };

  const selectRename = () => {
    setOpen(false);
    onRename();
  };

  const selectDelete = () => {
    setOpen(false);
    onDelete();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();

    if (key === 'r') {
      event.preventDefault();
      event.stopPropagation();
      selectRename();
    } else if (key === 'd') {
      event.preventDefault();
      event.stopPropagation();
      selectDelete();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Chat actions"
          className="cursor-pointer rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <EllipsisVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onKeyDownCapture={handleKeyDown}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-56 rounded-lg bg-white border border-border/80 p-1.5 shadow-xl"
      >
        <DropdownMenuItem
          onSelect={selectDownload}
          className="flex cursor-pointer items-center gap-3 px-2.5 py-1 text-sm"
        >
          <Download className="size-4" strokeWidth={1.6} />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={selectRename}
          className="flex cursor-pointer items-center gap-3 px-2.5 py-1 text-sm"
        >
          <Pencil className="size-4" strokeWidth={1.6} />
          Rename
          <DropdownMenuShortcut className="ml-auto text-sm tracking-normal">R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={selectDelete}
          className="flex cursor-pointer items-center gap-3 px-2.5 py-1 text-sm"
        >
          <Trash2 className="size-4" strokeWidth={1.6} />
          Delete
          <DropdownMenuShortcut className="ml-auto text-sm tracking-normal">D</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
