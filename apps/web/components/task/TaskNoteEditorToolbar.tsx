'use client';

import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { Bold, Code2, Heading2, Italic, List } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TaskNoteEditorToolbarProps = {
  editor: Editor;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
};

const ToolbarButton = ({ label, active = false, onClick, children }: ToolbarButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-control text-xs font-bold transition-colors',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
};

/** Compact formatting bar for the note editor. */
const TaskNoteEditorToolbar = ({ editor }: TaskNoteEditorToolbarProps) => {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isH2: editor.isActive('heading', { level: 2 }),
      isBold: editor.isActive('bold'),
      isItalic: editor.isActive('italic'),
      isBulletList: editor.isActive('bulletList'),
      isCodeBlock: editor.isActive('codeBlock'),
    }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-item border border-border bg-surface px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          label="Heading 2"
          active={state.isH2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Bold"
          active={state.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={state.isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={state.isCodeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
      </div>
    </div>
  );
};

export default TaskNoteEditorToolbar;
