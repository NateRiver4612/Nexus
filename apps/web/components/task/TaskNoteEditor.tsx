'use client';

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  useEditorState,
  Extension,
  Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder, Dropcursor } from '@tiptap/extensions';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

import { BubbleMenu } from '@tiptap/react/menus';
import Document from '@tiptap/extension-document';
import { createLowlight } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';
import CodeBlockComponent from '@/components/CodeBlockComponent';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import '@/styles/styles.scss';
import EditorPopupMenu from '@/components/EditorPopupMenu';
import {
  useCreateTaskNote,
  useDeleteTaskNote,
  useGetTaskNote,
  useGetTaskNotes,
  useUpdateTaskNote,
} from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useEffect, useRef, useState } from 'react';
import type { TaskNoteType } from '@nexus/types';
import DragHandle from '@tiptap/extension-drag-handle-react';
import SuggestionMenu from './SuggestionMenu';
import { CircleEllipsis, FileText, GripVertical, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { TooltipContent, TooltipTrigger, Tooltip } from '../ui/tooltip';
import { Kbd, KbdGroup } from '../ui/kbd';

const lowlight = createLowlight();

lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('js', js);
lowlight.register('ts', ts);

const CustomDocument = Document.extend({
  content: 'heading block*',
});

type SaveShortcutOptions = {
  onSave: (editor: Editor) => void;
};

const SaveShortcut = Extension.create<SaveShortcutOptions>({
  name: 'saveShortcut',

  addOptions() {
    return {
      onSave: (_editor: Editor) => {},
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-s': ({ editor }) => {
        this.options.onSave(editor);

        return true;
      },
    };
  },
});

type TaskNoteEditorProps = {
  taskId: string;
  /** Present = editing an existing note; absent = creating a new one. */
  noteId?: string;
  /** Called with the new note's id after a create so the caller can navigate. */
  onCreated?: (noteId: string) => void;
  /** Called after the note is deleted so the caller can navigate away. */
  onDeleted?: () => void;
};

const TaskNoteEditor = ({ taskId, noteId, onCreated, onDeleted }: TaskNoteEditorProps) => {
  const [isSuggestionOpen, setIsSuggestionOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<boolean>(false);

  const taskNoteRef = useRef<TaskNoteType | undefined>(undefined);

  const { data: taskNote } = useGetTaskNote({
    variables: {
      taskId,
      noteId: noteId ?? '',
    },
    options: {
      enabled: !!noteId?.length,
    },
  });

  const { data: notes } = useGetTaskNotes({
    variables: taskId,
  });

  const { mutate: createTaskNote, isPending: isCreatingTaskNote } = useCreateTaskNote({
    onSuccess: (data: TaskNoteType) => {
      onCreated?.(data.id);
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
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        trailingNode: {
          node: 'paragraph',
        },
      }),
      SaveShortcut.configure({
        onSave: (editor) => {
          handleSave(editor, taskNoteRef.current);
        },
      }),
      CustomDocument,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'New Note';
          }

          return 'Can you add some further context?';
        },
        emptyNodeClass: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'my-custom-is-empty-heading-class';
          }
          return '';
        },
        showOnlyCurrent: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({ lowlight }),
      Image,
      Dropcursor,
    ],
    content: taskNote?.content,
    editorProps: {
      attributes: {
        class: 'tiptap h-full! outline-none w-full',
      },
    },

    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  });

  const editorState = useEditorState({
    editor,

    // the selector function is used to select the state you want to react to
    selector: ({ editor }) => {
      if (!editor) return null;

      return {
        isEditable: editor.isEditable,
        currentSelection: editor.state.selection,
        currentContent: editor.getJSON(),
        currentContentText: editor.getText(),
      };
    },
  });

  const currentContentText = editorState?.currentContent.content
    ?.map((c: any) => {
      if (c.type === 'image') {
        return c.attrs.src;
      }
      return c.content?.[0].text;
    })
    .join('')
    .replaceAll('\n', '');

  useEffect(() => {
    if (!editor || !taskNote) {
      return;
    }

    editor.commands.setContent(taskNote.content);
  }, [editor, taskNote]);

  useEffect(() => {
    taskNoteRef.current = taskNote;
  }, [taskNote]);

  const handleSave = (editor?: Editor, taskNote?: TaskNoteType) => {
    const content = editor?.getJSON();

    if (!taskId || !content) {
      return;
    }

    const title =
      (
        content.content?.find((c) => c.type === 'heading')?.content?.[0] as { text: string }
      )?.text.trim() ?? 'New Note';

    const contentText = editor?.getText();

    const isDirty =
      contentText?.trim().replaceAll('\n', '') !==
      taskNote?.contentText?.trim().replaceAll('\n', '');

    if (!isDirty) {
      return;
    }

    if (noteId) {
      updateTaskNote({
        taskId,
        noteId,
        input: {
          content,
          title,
          contentText,
        },
      });
      return;
    }

    createTaskNote({
      taskId,
      input: {
        content,
        title,
      },
    });
  };

  if (!editor || !editorState) {
    return null;
  }

  const isSaving = noteId ? isUpdatingTaskNote : isCreatingTaskNote;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-full relative rounded-2xl border border-gray-300 p-6 pt-3! pr-3! w-full bg-white">
        <div className="flex justify-end">
          <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
            <DropdownMenuTrigger asChild>
              <CircleEllipsis
                size={20}
                strokeWidth={1.5}
                className="cursor-pointer text-gray-400"
              ></CircleEllipsis>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={` p-0 bg-white shadow-xl text-sm rounded-lg overflow-hidden`}
            >
              <DropdownMenuItem
                onSelect={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                className="flex items-center justify-between px-2 border-none! cursor-pointer rounded text-foreground"
              >
                {noteId && taskNote && (
                  <div className="text-destructive flex items-center gap-2">
                    <Trash2 size={16} />
                    Delete
                  </div>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {editor && (
          <BubbleMenu className="bubble-menu" editor={editor} draggable>
            <EditorPopupMenu editor={editor}></EditorPopupMenu>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} className="h-full" />
        <DragHandle editor={editor} className="pb-2 pr-2">
          <div className="flex items-center mb-1 mr-1 gap-0.5">
            <SuggestionMenu
              editor={editor}
              open={isSuggestionOpen}
              onOpenChange={setIsSuggestionOpen}
            >
              <Button
                type="button"
                draggable={false}
                className="flex items-center text-gray-500 bg-gray-200 justify-center rounded transition"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsSuggestionOpen(true);
                }}
              >
                <Plus size={16}></Plus>
              </Button>
            </SuggestionMenu>
            <Button type="button" className=" text-gray-500 bg-gray-200 cursor-grab rounded">
              <GripVertical size={16}></GripVertical>
            </Button>
          </div>
        </DragHandle>
        {!currentContentText?.length && (
          <div className="flex text-sm gap-3 absolute w-full bottom-4 items-start flex-col">
            <div className="text-start">
              <span className="text-[#d6d4d2]">Recents</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {notes?.map((n) => {
                return (
                  <Link
                    href={`/tasks/${taskId}/note/${n.id}`}
                    className="flex gap-1 items-center hover:opacity-70 transition cursor-pointer text-[#737371]  bg-[#f2f1ef] rounded-full pl-3 pr-4 py-2"
                  >
                    <FileText size={15} />
                    <p className="truncate max-w-30">{n.title}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end items-center gap-2 mt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleSave(editor, taskNote)}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <span>+</span>
              <Kbd>s</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
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

export default TaskNoteEditor;
