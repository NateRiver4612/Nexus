'use client';

import * as React from 'react';
import { Editor } from '@tiptap/react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  ListCollapse,
  FileText,
  Megaphone,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'; // adjust import path to your file location

export interface SuggestionMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  command: (editor: Editor) => void;
}

export interface SuggestionMenuProps {
  editor: Editor | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export const BASIC_BLOCK_ITEMS: SuggestionMenuItem[] = [
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    command: (editor) => {
      editor.chain().focus().clearNodes().setNode('paragraph').run();
    },
  },
  {
    id: 'h1',
    label: 'Heading 1',
    shortcut: '#',
    icon: Heading1,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'h2',
    label: 'Heading 2',
    shortcut: '##',
    icon: Heading2,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'h3',
    label: 'Heading 3',
    shortcut: '###',
    icon: Heading3,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: 'h4',
    label: 'Heading 4',
    shortcut: '####',
    icon: Heading4,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleHeading({ level: 4 }).run();
    },
  },
  {
    id: 'bullet_list',
    label: 'Bulleted list',
    shortcut: '-',
    icon: List,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleBulletList().run();
    },
  },
  {
    id: 'numbered_list',
    label: 'Numbered list',
    shortcut: '1.',
    icon: ListOrdered,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleOrderedList().run();
    },
  },
  {
    id: 'todo_list',
    label: 'To-do list',
    shortcut: '[]',
    icon: ListTodo,
    command: (editor) => {
      editor.chain().focus().clearNodes().toggleTaskList().run();
    },
  },
  {
    id: 'toggle_list',
    label: 'Toggle list',
    shortcut: '>',
    icon: ListCollapse,
    command: (editor) => {
      editor.chain().focus().clearNodes().setNode('paragraph').run();
    },
  },
  {
    id: 'page',
    label: 'Page',
    icon: FileText,
    command: (editor) => {
      editor.chain().focus().clearNodes().setNode('paragraph').run();
    },
  },
  {
    id: 'callout',
    label: 'Callout',
    icon: Megaphone,
    command: (editor) => {
      editor.chain().focus().clearNodes().setNode('paragraph').run();
    },
  },
];

export const SuggestionMenu: React.FC<SuggestionMenuProps> = ({
  editor,
  open,
  onOpenChange,
  children,
  className = '',
}) => {
  const handleSelect = (item: SuggestionMenuItem) => {
    if (editor) {
      item.command(editor);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {children && <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>}

      <DropdownMenuContent
        align="start"
        className={`w-72 p-0 bg-white shadow-xl border border-border/80 font-sans text-sm rounded-xl overflow-hidden ${className}`}
      >
        {/* Scrollable menu content area */}
        <div className="pt-2 pb-1.5 px-1 max-h-90 overflow-y-auto">
          as
          <DropdownMenuLabel className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Basic blocks
          </DropdownMenuLabel>
          {BASIC_BLOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer rounded-md text-foreground hover:bg-accent focus:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-[13px] font-medium leading-none">{item.label}</span>
                </div>

                {item.shortcut && (
                  <DropdownMenuShortcut className="text-[11px] font-mono text-muted-foreground font-normal">
                    {item.shortcut}
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Footer info bar */}
        <div className="px-3 py-2 bg-muted/40 flex items-center justify-between text-muted-foreground text-xs select-none">
          <span className="text-[12px] font-medium">Close menu</span>
          <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest">
            esc
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SuggestionMenu;
