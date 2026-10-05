import type { NodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import '@/styles/styles.scss';

interface CodeBlockLowlightOptions {
  lowlight: {
    listLanguages: () => string[];
  };
  [key: string]: unknown;
}

export default function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const defaultLanguage = node.attrs.language as string | null;
  const { lowlight } = extension.options as CodeBlockLowlightOptions;

  return (
    <NodeViewWrapper className="code-block">
      <select
        contentEditable={false}
        defaultValue={defaultLanguage ?? 'null'}
        onChange={(event) => updateAttributes({ language: event.target.value })}
      >
        <option value="null">auto</option>
        <option disabled>—</option>
        {lowlight.listLanguages().map((lang, index) => (
          <option key={index} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent as={'code' as 'div'} />
      </pre>
    </NodeViewWrapper>
  );
}
