import { Children, createContext, isValidElement, memo, useContext } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import remarkAlert from 'remark-github-blockquote-alert';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { cn } from '@/lib/utils';
import { HighlightedCode } from './HighlightedCode';
import { MarkdownCallout, MarkdownCalloutTitle, type CalloutType } from './MarkdownCallout';
import {
  isRichBlockLanguage,
  MarkdownRichBlock,
  MarkdownRichBlockSkeleton,
} from './MarkdownRichBlock';
import { endsInsideOpenFence } from '@/lib/markdownFence';

type PreProps = { children?: ReactNode } & ExtraProps;

/**
 * Where the reply's unclosed fence ends (its text length), or null when every fence is closed.
 * Only the last block of a streaming reply can be open, and it always runs to the end of the text.
 */
const OpenFenceContext = createContext<number | null>(null);

const Pre = ({ children, node }: PreProps) => {
  const openFenceEnd = useContext(OpenFenceContext);
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return <pre>{children}</pre>;
  }

  const language = /language-([\w-]+)/.exec(child.props.className ?? '')?.[1];
  const code = String(child.props.children ?? '').replace(/\n$/, '');

  if (isRichBlockLanguage(language)) {
    // Half a YAML list never parses, so show a placeholder until the closing fence arrives.
    const isOpenBlock = openFenceEnd !== null && (node?.position?.end.offset ?? 0) >= openFenceEnd;
    return isOpenBlock ? (
      <MarkdownRichBlockSkeleton />
    ) : (
      <MarkdownRichBlock language={language!} code={code} />
    );
  }
  return <HighlightedCode code={code} language={language} copyable />;
};

/** The active callout type, so the nested title `<p>` knows which icon/label to show. */
const CalloutContext = createContext<CalloutType>('note');

const calloutTypeFromClassName = (className?: string): CalloutType | null => {
  const match = /markdown-alert-(note|tip|important|warning|caution)\b/.exec(className ?? '');
  return match ? (match[1] as CalloutType) : null;
};

const CalloutDiv = ({ className, children, ...props }: ComponentProps<'div'>) => {
  const type = calloutTypeFromClassName(className);
  if (!type)
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );

  return (
    <CalloutContext.Provider value={type}>
      <MarkdownCallout type={type}>{children}</MarkdownCallout>
    </CalloutContext.Provider>
  );
};

const CalloutParagraph = ({ className, children, ...props }: ComponentProps<'p'>) => {
  // The plugin emits a `p.markdown-alert-title` containing an octicon + the label; we replace
  // it with our own lucide title so we don't render GitHub's inline SVG.
  if (className?.includes('markdown-alert-title')) {
    return <MarkdownCalloutTitle type={useContext(CalloutContext)} />;
  }
  return (
    <p className={className} {...props}>
      {children}
    </p>
  );
};

type MarkdownProps = {
  children: string;
  /** Fade in each block as it mounts — used for streaming assistant replies. */
  fadeIn?: boolean;
  /** The text is still arriving, so a block that has no closing fence yet is unfinished. */
  streaming?: boolean;
};

// Props are primitives, so a parent re-render (e.g. typing in the composer) skips the
// expensive markdown parse; streaming still updates because `children` changes per token.
export const Markdown = memo(({ children, fadeIn, streaming }: MarkdownProps) => {
  const openFenceEnd =
    streaming && endsInsideOpenFence(children) ? children.trimEnd().length : null;

  return (
    <div
      className={cn(
        'markdown-body text-sm leading-6 break-words',
        fadeIn && 'markdown-fade-in',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
        '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_a]:text-blue-600 [&_a]:underline',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]',
        '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
      )}
    >
      <OpenFenceContext.Provider value={openFenceEnd}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkAlert, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Model output is untrusted: links never keep a reference to this page.
            a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            pre: Pre,
            div: CalloutDiv,
            p: CalloutParagraph,
            // Styled in globals.css under `.markdown-table`.
            table: ({ children, ...props }) => (
              <div className="markdown-table my-3">
                <table className="w-full border-collapse text-sm" {...props}>
                  {children}
                </table>
              </div>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </OpenFenceContext.Provider>
    </div>
  );
});
