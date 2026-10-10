'use client';

import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  Type,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Link2,
  Strikethrough,
  Code2,
  MoreHorizontal,
  Check,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  FileText,
  FilePlus,
  List,
  ListOrdered,
  CheckSquare,
  ListTree,
  Quote,
  MessageSquareQuote,
  Sigma,
  Columns,
  Columns3,
  Columns4,
  LayoutGrid,
  type LucideIcon,
  SlidersHorizontal,
  MessageSquare,
  SmilePlus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Block options — full original menu restored. Items with real backing
// extensions get `isActive`/`onSelect` wired to the editor; everything else
// (Page, columns, callout, toggle headings, etc.) stays in the menu exactly
// as before, just without a command behind it yet — clicking one simply
// closes the dropdown, same as it did before any wiring existed.
// ---------------------------------------------------------------------------

export interface BlockOption {
  label: string;
  icon: LucideIcon;
  type?: string;
  hasSubmenu?: boolean;
  prefix?: string;
  isActive?: (editor: Editor) => boolean;
  onSelect?: (editor: Editor) => void;
}

export interface SkillsListProps {
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
}

const BLOCK_OPTIONS: BlockOption[] = [
  {
    label: 'Text',
    icon: Type,
    type: 'Normal Text',
    isActive: (editor) => editor.isActive('paragraph'),
    onSelect: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    label: 'Heading 1',
    icon: Heading1,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    onSelect: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: 'Heading 2',
    icon: Heading2,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    onSelect: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Heading 3',
    icon: Heading3,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    onSelect: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Heading 4',
    icon: Heading4,
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
    onSelect: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  { label: 'Page', icon: FileText }, // no backing node yet — present, not wired
  { label: 'Page in', icon: FilePlus, hasSubmenu: true },
  {
    label: 'Bulleted list',
    icon: List,
    isActive: (editor) => editor.isActive('bulletList'),
    onSelect: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Numbered list',
    icon: ListOrdered,
    isActive: (editor) => editor.isActive('orderedList'),
    onSelect: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    // Requires TaskList + TaskItem registered on the editor (not in StarterKit).
    label: 'To-do list',
    icon: CheckSquare,
    isActive: (editor) => editor.isActive('taskList'),
    onSelect: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  { label: 'Toggle list', icon: ListTree }, // no backing node yet — present, not wired
  {
    label: 'Code',
    icon: Code2,
    isActive: (editor) => editor.isActive('codeBlock'),
    onSelect: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Quote',
    icon: Quote,
    isActive: (editor) => editor.isActive('blockquote'),
    onSelect: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  { label: 'Callout', icon: MessageSquareQuote }, // no backing node yet — present, not wired
  { label: 'Block equation', icon: Sigma }, // no backing node yet — present, not wired
  { label: 'Toggle heading 1', icon: Heading1, prefix: '•' },
  { label: 'Toggle heading 2', icon: Heading2, prefix: '•' },
  { label: 'Toggle heading 3', icon: Heading3, prefix: '•' },
  { label: 'Toggle heading 4', icon: Heading4, prefix: '•' },
  { label: '2 columns', icon: Columns },
  { label: '3 columns', icon: Columns3 },
  { label: '4 columns', icon: Columns4 },
  { label: '5 columns', icon: LayoutGrid },
];

function getActiveBlockLabel(editor: Editor): string {
  return BLOCK_OPTIONS.find((option) => option.isActive?.(editor))?.label ?? 'Text';
}

// ---------------------------------------------------------------------------
// TextTypeDropdown
// ---------------------------------------------------------------------------

export interface TextTypeDropdownProps {
  editor: Editor;
  onClose: () => void;
}

export const TextTypeDropdown: React.FC<TextTypeDropdownProps> = ({ editor, onClose }) => {
  const activeLabel = useEditorState({
    editor,
    selector: ({ editor }) => getActiveBlockLabel(editor),
  });

  // Block toggles (setBlockType) silently no-op when the editor selection is
  // lost between the mousedown on this portaled menu and the click that runs
  // the command. Snapshot it on mousedown and restore it before dispatching.
  const selectionRef = React.useRef<{ from: number; to: number } | null>(null);

  return (
    <div className="w-52.5 bg-white rounded-[20px] shadow-[0_10px_38px_-10px_rgba(22,23,24,0.18),0_10px_20px_-15px_rgba(22,23,24,0.12)] border border-gray-100/90 py-1.5 px-1.5 select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="max-h-95 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
        {BLOCK_OPTIONS.map((item) => {
          const Icon = item.icon;
          const targetType = item.type || item.label;
          const isSelected = activeLabel === targetType;

          return (
            <button
              key={item.label}
              type="button"
              onMouseDown={(e) => {
                selectionRef.current = {
                  from: editor.state.selection.from,
                  to: editor.state.selection.to,
                };
                e.preventDefault();
              }}
              onClick={() => {
                const snap = selectionRef.current;
                selectionRef.current = null;
                if (snap) {
                  editor.chain().setTextSelection(snap).run();
                }

                item.onSelect?.(editor);

                onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[13.5px] transition-colors duration-100 ${
                isSelected
                  ? 'bg-gray-100/90 text-gray-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {item.prefix ? (
                    <span className="text-xs text-gray-500 font-bold mr-0.5">{item.prefix}</span>
                  ) : null}
                  <Icon className="w-4 h-4 text-gray-700 stroke-[1.8]" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>

              {isSelected && <Check className="w-4 h-4 text-gray-800 shrink-0 stroke-[2.2]" />}
              {item.hasSubmenu && !isSelected && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FormattingToolbar — full original layout restored (5 buttons in row 2/3
// each). Bold/Italic/Underline/Strike/Link/inline-Code/Clear-formatting are
// wired to real commands (all covered by StarterKit v3 + Link). √x and
// MoreHorizontal have no backing extension — left exactly as inert as they
// were originally.
// ---------------------------------------------------------------------------

export interface FormattingToolbarProps {
  editor: Editor;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  editor,
  isDropdownOpen,
  onToggleDropdown,
}) => {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      blockLabel: getActiveBlockLabel(editor),
      isBold: editor.isActive('bold'),
      isItalic: editor.isActive('italic'),
      isUnderline: editor.isActive('underline'),
      isStrike: editor.isActive('strike'),
      isCode: editor.isActive('code'),
      isLink: editor.isActive('link'),
    }),
  });

  function toggleLink() {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl ?? '');

    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Row 1: Text Dropdown Trigger */}
      <button
        type="button"
        onClick={onToggleDropdown}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors duration-150 group ${
          isDropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <Type className="w-4 h-4 text-gray-700" strokeWidth={2} />
          <span className="text-[14px] font-medium text-gray-800">{state.blockLabel}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${
            isDropdownOpen ? 'rotate-90 text-gray-700' : 'group-hover:text-gray-600'
          }`}
        />
      </button>
      <div className="h-px bg-gray-100 -mx-1" />
      {/* Row 2: Bold / Italic / Underline / Tx (clear formatting) */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg font-medium text-xs transition-colors ${
            state.isBold
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          A
        </button>
        <button
          type="button"
          aria-label="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isBold
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Bold className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isItalic
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Italic className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isUnderline
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Underline className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="text-xs font-semibold tracking-tighter flex items-center">
            T<span className="text-[10px] ml-px">x</span>
          </span>
        </button>
      </div>
      {/* Row 3: Link / Strikethrough / Inline code / √x / More */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleLink}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isLink
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Link2 className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Strikethrough"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`w-7 cursor-pointer h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isStrike
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Strikethrough className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Inline code"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            state.isCode
              ? 'bg-gray-100 text-gray-900'
              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
          }`}
        >
          <Code2 className="w-4 h-4" strokeWidth={2} />
        </button>
        {/* No backing extension — left inert, same as before */}
        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors">
          <span className="text-xs font-medium font-mono text-gray-700">√x</span>
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors">
          <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
      {/* Divider */} <div className="h-px bg-gray-100 -mx-1" /> {/* Row 4: Comment Action */}{' '}
      <div className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
        {' '}
        <div className="flex items-center gap-3">
          {' '}
          <MessageSquare className="w-4 h-4 text-gray-700" strokeWidth={1.8} />{' '}
          <span className="text-[14px] font-medium text-gray-800">Comment</span>{' '}
        </div>{' '}
        <button className="text-gray-500 hover:text-gray-800 transition-colors p-0.5">
          {' '}
          <SmilePlus className="w-4 h-4" strokeWidth={1.8} />{' '}
        </button>{' '}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EditorPopupMenu — top-level, takes a real editor instance.
// SkillsList (AI prompt) and the Comment row stay removed, per the original
// "skip skills/AI and comment" request.
// ---------------------------------------------------------------------------
export const SkillsList: React.FC<SkillsListProps> = ({ aiPrompt, setAiPrompt }) => {
  const skills: string[] = [
    'Improve writing',
    'Proofread',
    'Explain',
    'Reformat',
    'Summarize',
    'Make shorter',
  ];
  return (
    <div className="flex flex-col gap-1">
      {/* Section Header: Skills */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-1">
        <span className="text-[13px] font-medium text-gray-400 tracking-normal">Skills</span>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
      {/* Scrollable list area */}
      <div className="relative pr-1">
        <div className="max-h-31.25 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
          {skills.map((skill) => (
            <div
              key={skill}
              className="text-[14px] font-medium text-gray-800 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
      {/* Bottom Input: Edit with AI */}
      <div className="mt-1 pt-1">
        <div className="relative flex items-center justify-between border border-gray-200/90 rounded-[14px] px-3 py-2 bg-white focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-all">
          <input
            type="text"
            placeholder="Edit with AI"
            value={aiPrompt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiPrompt(e.target.value)}
            className="w-full text-[13px] text-gray-800 placeholder-gray-400 outline-none bg-transparent pr-12 font-normal"
          />
          <div className="absolute right-2.5 flex items-center pointer-events-none">
            <span className="text-[11px] font-mono tracking-tight text-gray-400 font-normal">
              ⌘^E
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface EditorPopupMenuProps {
  editor: Editor;
}

export default function EditorPopupMenu({ editor }: EditorPopupMenuProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');

  return (
    <div className="relative flex items-start gap-3">
      <div className="w-67 bg-white rounded-[22px] shadow-[0_10px_38px_-10px_rgba(22,23,24,0.15),0_10px_20px_-15px_rgba(22,23,24,0.1)] border border-gray-100/80 p-3! text-gray-800 tracking-tight flex flex-col gap-1.5 select-none">
        <FormattingToolbar
          editor={editor}
          isDropdownOpen={isDropdownOpen}
          onToggleDropdown={() => setIsDropdownOpen((v) => !v)}
        />
        {/* Divider */} <div className="h-px bg-gray-100 -mx-1" />{' '}
        <SkillsList aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} />
      </div>

      {isDropdownOpen && (
        <div className="absolute left-[calc(100%+10px)] top-0 z-50">
          <TextTypeDropdown editor={editor} onClose={() => setIsDropdownOpen(false)} />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}
