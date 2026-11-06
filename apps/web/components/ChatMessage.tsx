import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ChatCitationType, MessageType } from '@nexus/types';
import { chatCitationsSchema, citationKey } from '@nexus/zod-schemas';

import { cn } from '@/lib/utils';

function Markdown({ children }: { children: string }) {
  return (
    <div
      className={cn(
        'text-sm leading-6 break-words',
        '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
        '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_a]:text-blue-600 [&_a]:underline',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]',
        '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto',
        '[&_th]:border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Model output is untrusted: links never keep a reference to this page.
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

type ChatMessageProps = {
  role: MessageType['role'];
  content: string;
  /** The reply was cut short (the user stopped it, or the provider failed mid-stream). */
  partial?: boolean;
  isStreaming?: boolean;
  sources?: ChatCitationType[];
  /** The tool running right now, shown while the reply is still being produced. */
  activity?: string | null;
};

/** Citations are stored in `metadata.citations`; anything malformed is simply not shown. */
export function citationsOf(metadata: MessageType['metadata']): ChatCitationType[] {
  const parsed = chatCitationsSchema.safeParse(metadata?.citations);
  return parsed.success ? parsed.data : [];
}

export function ChatMessage({
  role,
  content,
  partial,
  isStreaming,
  sources,
  activity,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl bg-secondary px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[90%]">
      {activity ? (
        <p className="mb-1 text-sm text-muted-foreground">{activity}</p>
      ) : (
        !content && isStreaming && <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
      {content && <Markdown>{content}</Markdown>}
      {sources && sources.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sources:{' '}
          {sources.map((source, index) => (
            <span key={citationKey(source)}>
              {index > 0 && ', '}
              {source.kind === 'web' ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </span>
          ))}
        </p>
      )}
      {partial && <p className="mt-1 text-xs text-muted-foreground">Stopped</p>}
    </div>
  );
}
