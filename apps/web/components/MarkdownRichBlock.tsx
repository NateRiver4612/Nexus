import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import type { ReactNode } from 'react';
import { parse } from 'yaml';
import type { ZodType } from 'zod';
import type {
  AccordionBlockType,
  CompareBlockType,
  StatsBlockType,
  StepItemType,
  StepsBlockType,
  TimelineBlockType,
} from '@nexus/types';
import {
  accordionBlockSchema,
  compareBlockSchema,
  richBlockLanguages,
  statsBlockSchema,
  stepsBlockSchema,
  timelineBlockSchema,
  type RichBlockLanguage,
} from '@nexus/zod-schemas';

import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Skeleton } from './ui/skeleton';
// Bodies are markdown. The import is circular (Markdown renders this file) but only used at render time.
import { Markdown } from './Markdown';

/**
 * Fenced "component" blocks the model may emit. Content is YAML, parsed and validated here
 * because it is untrusted model output. Validation is intentionally lenient — `status` and
 * `tone` accept any string and unknown values fall back to a neutral style — so a block the
 * model emits never turns into a dark code block. Only unparseable input shows the raw source.
 */

function parseYaml(code: string): unknown {
  try {
    return parse(code);
  } catch {
    return null;
  }
}

const TONE_CONTAINER: Record<string, string> = {
  default: 'border-border bg-card',
  primary: 'border-primary/30 bg-primary/5',
  success: 'border-green-200 bg-green-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
};

const TONE_VALUE: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary-foreground',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

const TONE_DOT: Record<string, string> = {
  default: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const toneContainer = (tone?: string) => TONE_CONTAINER[tone ?? ''] ?? TONE_CONTAINER.default!;
const toneValue = (tone?: string) => TONE_VALUE[tone ?? ''] ?? TONE_VALUE.default!;
const toneDot = (tone?: string) => TONE_DOT[tone ?? ''] ?? TONE_DOT.default!;

/** Unknown statuses render as a neutral "pending" dot; the raw text is kept as a label. */
const stepIcon = (status?: string) => {
  const s = (status ?? '').toLowerCase();
  if (/done|complete/.test(s)) return <CheckCircle2 className="size-4 shrink-0 text-green-600" />;
  if (/in progress|in_progress|current|doing|active/.test(s)) {
    return <CircleDot className="size-4 shrink-0 text-primary-foreground" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground" />;
};

const Step = ({ step }: { step: StepItemType }) => {
  const title = typeof step === 'string' ? step : step.title;
  const body = typeof step === 'string' ? undefined : step.body;
  const status = typeof step === 'string' ? undefined : step.status;

  return (
    <li className="flex gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="mt-0.5">{stepIcon(status)}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {title}
          {status && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{status}</span>
          )}
        </p>
        {body && (
          <div className="text-muted-foreground">
            <Markdown>{body}</Markdown>
          </div>
        )}
      </div>
    </li>
  );
};

const StatsBlock = ({ stats }: { stats: StatsBlockType }) => (
  <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {stats.map((stat, index) => (
      <div key={index} className={cn('rounded-lg border px-3 py-2', toneContainer(stat.tone))}>
        <p className="text-xs text-muted-foreground">{stat.label}</p>
        <p className={cn('text-lg font-semibold', toneValue(stat.tone))}>{stat.value}</p>
        {stat.detail && <p className="text-xs text-muted-foreground">{stat.detail}</p>}
      </div>
    ))}
  </div>
);

const StepsBlock = ({ steps }: { steps: StepsBlockType }) => (
  <ol className="my-3 space-y-2">
    {steps.map((step, index) => (
      <Step key={index} step={step} />
    ))}
  </ol>
);

const TimelineBlock = ({ items }: { items: TimelineBlockType }) => (
  <ol className="my-3 space-y-3 border-l border-border pl-4">
    {items.map((item, index) => (
      <li key={index} className="relative">
        <span
          className={cn(
            'absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-background',
            toneDot(item.tone),
          )}
          aria-hidden
        />
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.when && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {item.when}
              </span>
            )}
            {item.status && <span className="text-xs text-muted-foreground">{item.status}</span>}
          </div>
          {item.body && (
            <div className="text-muted-foreground">
              <Markdown>{item.body}</Markdown>
            </div>
          )}
        </div>
      </li>
    ))}
  </ol>
);

const CompareBlock = ({ columns }: { columns: CompareBlockType }) => (
  <div className="my-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {columns.map((column, index) => (
      <div key={index} className={cn('rounded-lg border px-3 py-2', toneContainer(column.tone))}>
        <p className="mb-1 text-sm font-semibold">{column.title}</p>
        <ul className="space-y-1">
          {column.items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden>•</span>
              <div className="min-w-0 flex-1">
                <Markdown>{item}</Markdown>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

// All collapsed to start with, and any number can be open at once.
const AccordionBlock = ({ items }: { items: AccordionBlockType }) => (
  <Accordion type="multiple" className="my-3 rounded-lg border border-border bg-card px-3">
    {items.map((item, index) => (
      <AccordionItem key={index} value={String(index)}>
        <AccordionTrigger>{item.title}</AccordionTrigger>
        <AccordionContent>
          <Markdown>{item.body}</Markdown>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

/** Stands in for a block whose closing fence hasn't streamed in yet. */
export const MarkdownRichBlockSkeleton = () => (
  <div className="my-3 space-y-2 rounded-lg border border-border bg-card p-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

/** Unparseable input: show the source as a plain, non-code panel, never syntax-highlighted. */
const RawBlock = ({ code }: { code: string }) => (
  <div className="my-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
    <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{code}</pre>
  </div>
);

/**
 * Pairs a block's schema with its renderer, so `render` gets correctly typed data. The result
 * takes the raw parsed YAML and returns the rendered block, or null when it fails validation.
 */
const defineBlock =
  <T,>({ schema, render }: { schema: ZodType<T>; render: (data: T) => ReactNode }) =>
  (raw: unknown): ReactNode | null => {
    const result = schema.safeParse(raw);
    return result.success ? render(result.data) : null;
  };

type RenderBlock = (raw: unknown) => ReactNode | null;

/**
 * Renderer for every block the model may emit. Keyed by the shared language list, so adding a
 * language there is a compile error here until it has a renderer. Also add a line describing it
 * in the prompt's Formatting section.
 */
const RICH_BLOCKS: Record<RichBlockLanguage, RenderBlock> = {
  stats: defineBlock({ schema: statsBlockSchema, render: (stats) => <StatsBlock stats={stats} /> }),
  steps: defineBlock({ schema: stepsBlockSchema, render: (steps) => <StepsBlock steps={steps} /> }),
  timeline: defineBlock({
    schema: timelineBlockSchema,
    render: (items) => <TimelineBlock items={items} />,
  }),
  compare: defineBlock({
    schema: compareBlockSchema,
    render: (columns) => <CompareBlock columns={columns} />,
  }),
  accordion: defineBlock({
    schema: accordionBlockSchema,
    render: (items) => <AccordionBlock items={items} />,
  }),
};

// `includes`, not an object lookup: a fence tagged `constructor` must not match anything inherited.
export const isRichBlockLanguage = (language?: string): language is RichBlockLanguage =>
  Boolean(language && (richBlockLanguages as readonly string[]).includes(language));

export const MarkdownRichBlock = ({ language, code }: { language: string; code: string }) => {
  if (!isRichBlockLanguage(language)) return <RawBlock code={code} />;

  const rendered = RICH_BLOCKS[language](parseYaml(code));
  return rendered ?? <RawBlock code={code} />;
};
