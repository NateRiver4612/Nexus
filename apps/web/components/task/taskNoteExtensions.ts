import type { Editor } from '@tiptap/react';
import { Extension, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder, Dropcursor } from '@tiptap/extensions';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Document from '@tiptap/extension-document';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { createLowlight } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';

import CodeBlockComponent from '@/components/CodeBlockComponent';

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

/** Tiptap extension set for task notes — one heading, then blocks, with Cmd+S save. */
export const createTaskNoteExtensions = (onSave: (editor: Editor) => void) => [
  StarterKit.configure({
    codeBlock: false,
    trailingNode: {
      node: 'paragraph',
    },
  }),
  SaveShortcut.configure({ onSave }),
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
    emptyNodeClass: ({ node }) =>
      node.type.name === 'heading' ? 'my-custom-is-empty-heading-class' : '',
    showOnlyCurrent: false,
  }),
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({ lowlight }),
  Image,
  Dropcursor,
];
