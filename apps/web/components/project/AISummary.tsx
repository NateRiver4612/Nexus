'use client';

import type { KickoffPlanType } from '@nexus/types';
import type { ReactNode } from 'react';

import Overview from '../Overview';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Skeleton } from '../ui/skeleton';

type AISummaryProps = {
  summary?: KickoffPlanType['summary'];
  isLoading?: boolean;
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</p>
);

const AISummarySkeleton = () => {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-24 w-full rounded-item" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-11 w-full rounded-item" />
        <Skeleton className="h-11 w-full rounded-item" />
        <Skeleton className="h-11 w-full rounded-item" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-24 w-full rounded-item" />
      </div>
    </div>
  );
};

const AISummary = ({ summary, isLoading }: AISummaryProps) => {
  if (isLoading || !summary) {
    return <AISummarySkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <SectionLabel>Plan Overview</SectionLabel>
        <div className="rounded-item bg-surface-secondary p-4">
          <Overview data={summary.overview} showTitle={false} />
        </div>
      </section>

      {summary.keyTopics.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Key Topics ({summary.keyTopics.length})</SectionLabel>
          <Accordion type="multiple" className="gap-2">
            {summary.keyTopics.map((topic, index) => (
              <AccordionItem
                key={`${topic.topic}-${index}`}
                value={`topic-${index}`}
                className="rounded-item border border-border bg-surface px-4"
              >
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                    {topic.topic}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-xs leading-relaxed text-muted-foreground">
                  {topic.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {summary.highlights.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Architectural Highlights</SectionLabel>
          <ul className="flex flex-col gap-2 rounded-item border border-accent/50 bg-accent-soft/50 p-4">
            {summary.highlights.map((highlight, index) => (
              <li key={`${highlight}-${index}`} className="flex gap-2">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-tertiary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-foreground">
                  {highlight}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default AISummary;
