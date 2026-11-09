import type { ChatCitationType } from '@nexus/types';
import { citationKey } from '@nexus/zod-schemas';
import { BookOpenText } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SourceFavicon } from './SourceFavicon';

const CARD_CLASS =
  'flex flex-col justify-center rounded-xl border border-border bg-background px-4 py-3';

const SourceCard = ({ source }: { source: ChatCitationType }) => {
  if (source.kind === 'web') {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${CARD_CLASS} transition-colors hover:bg-accent`}
      >
        <div className="flex items-center gap-3">
          <SourceFavicon favicon={source.favicon} />
          <span className="line-clamp-1 text-sm font-semibold text-primary">{source.name}</span>
        </div>
        <span className="mt-1 truncate pl-7 text-xs text-muted-foreground">{source.url}</span>
      </a>
    );
  }

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center gap-3">
        <BookOpenText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="line-clamp-1 text-sm font-semibold">{source.name}</span>
      </div>
      <span className="mt-1 truncate pl-7 text-xs text-muted-foreground">Knowledge source</span>
    </div>
  );
};

export const ChatSources = ({ sources }: { sources: ChatCitationType[] }) => {
  // Older messages may already hold more web citations than the current cap.
  if (sources.length === 0) return null;

  return (
    <Accordion type="single" collapsible defaultValue="sources" className="mt-3">
      <AccordionItem value="sources" className="border-none">
        <AccordionTrigger className="py-0 text-xs font-medium text-muted-foreground hover:no-underline">
          Sources <span className="text-muted-foreground/70">({sources.length})</span>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-0">
          <div className="flex flex-col gap-2">
            {sources.map((source) => (
              <SourceCard key={citationKey(source)} source={source} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
