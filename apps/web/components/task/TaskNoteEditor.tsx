'use client';

import { memo, useEffect, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import DragHandle from '@tiptap/extension-drag-handle-react';
import { NodeSelection } from '@tiptap/pm/state';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import '@/styles/styles.scss';

import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import EditorPopupMenu from '@/components/EditorPopupMenu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreateTaskNote,
  useDeleteTaskNote,
  useGetTaskNote,
  useUpdateTaskNote,
} from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

import SuggestionMenu from './SuggestionMenu';
import { createTaskNoteExtensions } from './taskNoteExtensions';
import TaskNoteEditorToolbar from './TaskNoteEditorToolbar';

type TaskNoteEditorProps = {
  taskId: string;
  /** Present = editing an existing note; absent = creating a new one. */
  noteId?: string;
  /** Called with the new note's id after a create so the caller can navigate. */
  onCreated?: (noteId: string) => void;
  /** Called after the note is deleted so the caller can navigate away. */
  onDeleted?: () => void;
  /** Switches the workbench to a blank note. */
  onNewNote?: () => void;
  /** Rendered at the end of the title/save header (e.g. the workbench tabs). */
  headerEnd?: ReactNode;
  className?: string;
};

export const TaskNoteEditorSkeleton = ({ headerEnd }: { headerEnd?: ReactNode }) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-pill" />
        </div>
        {headerEnd}
      </div>
      <div className="px-4 pb-3 pt-3">
        <Skeleton className="h-9 w-full rounded-item" />
      </div>
      <div className="flex-1 px-4 py-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-8 w-32 rounded-pill" />
      </div>
    </div>
  );
};

const normalizeText = (text?: string | null) => (text ?? '').trim().replaceAll('\n', '');

/** Note editor panel: Tiptap document with save, copy, and delete actions. */
const TaskNoteEditor = ({
  taskId,
  noteId,
  onCreated,
  onDeleted,
  onNewNote,
  headerEnd,
  className,
}: TaskNoteEditorProps) => {
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: taskNote } = useGetTaskNote({
    variables: {
      taskId,
      noteId: noteId ?? '',
    },
    options: {
      enabled: !!noteId?.length,
    },
  });

  const { mutate: createTaskNote, isPending: isCreatingTaskNote } = useCreateTaskNote({
    onSuccess: (res) => {
      onCreated?.(res.data.id);
    },
  });

  const { mutate: updateTaskNote, isPending: isUpdatingTaskNote } = useUpdateTaskNote();

  const { mutate: deleteTaskNote, isPending: isDeletingTaskNote } = useDeleteTaskNote({
    onSuccess: () => {
      setDeleteOpen(false);
      setDeleteError(null);
      onDeleted?.();
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the note.');
    },
  });

  const editor = useEditor({
    autofocus: 'start',
    extensions: createTaskNoteExtensions((nextEditor) => handleSave(nextEditor)),
    content: taskNote?.content,
    editorProps: {
      attributes: {
        class: 'tiptap outline-none w-full min-h-full',
      },
    },

    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  });

  // Subscribing to the text re-renders on every transaction, keeping dirty/save state live.
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      contentText: editor?.getText() ?? '',
    }),
  });

  const contentText = editorState?.contentText ?? '';
  const isDirty = normalizeText(contentText) !== normalizeText(taskNote?.contentText);
  const firstLine = contentText.split('\n')[0]?.trim();
  const displayTitle = firstLine || taskNote?.title || 'New Note';

  useEffect(() => {
    if (!editor || !taskNote) {
      return;
    }

    editor.commands.setContent(taskNote.content);
  }, [editor, taskNote]);

  function handleSave(nextEditor?: Editor) {
    const content = nextEditor?.getJSON();

    if (!taskId || !content) {
      return;
    }

    const latestText = nextEditor?.getText() ?? '';

    if (normalizeText(latestText) === normalizeText(taskNote?.contentText)) {
      return;
    }

    const heading = content.content?.find((node) => node.type === 'heading')?.content?.[0] as
      { text: string } | undefined;
    const title = heading?.text.trim() || 'New Note';

    if (noteId) {
      updateTaskNote({
        taskId,
        noteId,
        input: {
          content,
          title,
          contentText: latestText,
        },
      });
      return;
    }

    createTaskNote({
      taskId,
      input: {
        content,
        title,
        contentText: latestText,
      },
    });
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contentText);
      toast.success('Note copied to clipboard.');
    } catch {
      toast.error('Could not copy the note.');
    }
  };

  if (!editor) {
    return <TaskNoteEditorSkeleton headerEnd={headerEnd} />;
  }

  const isSaving = noteId ? isUpdatingTaskNote : isCreatingTaskNote;
  const statusLabel = isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'Saved';
  const statusClassName = isSaving
    ? 'bg-accent-soft text-accent-foreground'
    : isDirty
      ? 'bg-accent-tertiary-soft text-accent-tertiary-foreground'
      : 'bg-success-soft text-success-foreground';

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-foreground">{displayTitle}</p>
          <span
            className={cn(
              'shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-bold',
              statusClassName,
            )}
          >
            {statusLabel}
          </span>
        </div>
        {headerEnd}
      </div>

      <div className="px-4 pb-3 pt-3">
        <TaskNoteEditorToolbar editor={editor} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <EditorContent editor={editor} className="h-full" />

        <BubbleMenu
          className="bubble-menu"
          editor={editor}
          draggable
          shouldShow={({ state }) => {
            const { selection } = state;

            if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
              return false;
            }

            // Don't show when there's only a cursor
            if (selection.empty) {
              return false;
            }

            return true;
          }}
        >
          <EditorPopupMenu editor={editor} />
        </BubbleMenu>

        <DragHandle editor={editor} className="pb-2 pr-2">
          <div className="mb-1 mr-1 flex items-center gap-0.5">
            <SuggestionMenu
              editor={editor}
              open={isSuggestionOpen}
              onOpenChange={setIsSuggestionOpen}
            >
              <Button
                type="button"
                draggable={false}
                className="flex items-center justify-center rounded bg-gray-200 text-gray-500 transition"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsSuggestionOpen(true);
                }}
              >
                <Plus className="size-4" />
              </Button>
            </SuggestionMenu>
            <Button type="button" className="cursor-grab rounded bg-gray-200 text-gray-500">
              <GripVertical className="size-4" />
            </Button>
          </div>
        </DragHandle>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex items-center gap-1">
          {noteId && taskNote && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Delete note"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!contentText.trim()}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Copy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onNewNote && (
            <Button type="button" variant="outline" size="sm" onClick={onNewNote}>
              <Plus className="size-3.5" aria-hidden="true" />
              New Note
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(editor)}
            disabled={!isDirty || isSaving}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
      </div>

      {noteId && (
        <DeleteConfirmDialog
          open={deleteOpen}
          close={() => setDeleteOpen(false)}
          confirmDelete={() => deleteTaskNote({ taskId, noteId })}
          error={deleteError}
          isDeleting={isDeletingTaskNote}
          requiredText={taskNote?.title ?? ''}
          content="This note will be permanently deleted and cannot be undone."
        />
      )}
    </div>
  );
};

// Props are stable (see TaskWorkbench), so hide/show tab switches skip re-rendering the editor.
export default memo(TaskNoteEditor);
