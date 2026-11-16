import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { parse } from 'yaml';
import { z } from 'zod';

import { cn } from '@/lib/utils';

/**
 * Fenced "component" blocks the model may emit. Content is YAML, parsed and validated here
 * because it is untrusted model output. Validation is intentionally lenient — `status` and
 * `tone` accept any string and unknown values fall back to a neutral style — so a block the
 * model emits never turns into a dark code block. Only unparseable input shows the raw source.
 */

const statSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.union([z.string(), z.number()]).transform((value) => String(value)),
  detail: z.string().max(200).optional(),
  tone: z.string().max(40).optional(),
});
const statsSchema = z.array(statSchema).min(1).max(6);

const stepSchema = z.union([
  z.object({
    title: z.string().min(1).max(200),
    body: z.string().max(1000).optional(),
    status: z.string().max(40).optional(),
  }),
  z.string().min(1).max(300),
]);
const stepsSchema = z.array(stepSchema).min(1).max(12);

const compareColumnSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(z.string().min(1).max(300)).min(1).max(10),
  tone: z.string().max(40).optional(),
});
const compareSchema = z.array(compareColumnSchema).min(2).max(3);

type ParsedBlock =
  | { kind: 'stats'; data: z.infer<typeof statsSchema> }
  | { kind: 'steps'; data: z.infer<typeof stepsSchema> }
  | { kind: 'compare'; data: z.infer<typeof compareSchema> };

const RICH_BLOCK_LANGUAGES = ['stats', 'steps', 'compare'] as const;

export const isRichBlockLanguage = (language?: string) =>
  Boolean(language && (RICH_BLOCK_LANGUAGES as readonly string[]).includes(language));

function parseYaml(code: string): unknown {
  try {
    return parse(code);
  } catch {
    return null;
  }
}

function parseBlock(language: string, code: string): ParsedBlock | null {
  const raw = parseYaml(code);

  if (language === 'stats') {
    const result = statsSchema.safeParse(raw);
    return result.success ? { kind: 'stats', data: result.data } : null;
  }
  if (language === 'steps') {
    const result = stepsSchema.safeParse(raw);
    return result.success ? { kind: 'steps', data: result.data } : null;
  }
  if (language === 'compare') {
    const result = compareSchema.safeParse(raw);
    return result.success ? { kind: 'compare', data: result.data } : null;
  }
  return null;
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
  primary: 'text-primary',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

const toneContainer = (tone?: string) => TONE_CONTAINER[tone ?? ''] ?? TONE_CONTAINER.default!;
const toneValue = (tone?: string) => TONE_VALUE[tone ?? ''] ?? TONE_VALUE.default!;

/** Unknown statuses render as a neutral "pending" dot; the raw text is kept as a label. */
const stepIcon = (status?: string) => {
  const s = (status ?? '').toLowerCase();
  if (/done|complete/.test(s)) return <CheckCircle2 className="size-4 shrink-0 text-green-600" />;
  if (/in progress|in_progress|current|doing|active/.test(s)) {
    return <CircleDot className="size-4 shrink-0 text-primary" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground" />;
};

const Step = ({ step }: { step: z.infer<typeof stepSchema> }) => {
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
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
      </div>
    </li>
  );
};

const StatsBlock = ({ stats }: { stats: z.infer<typeof statsSchema> }) => (
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

const StepsBlock = ({ steps }: { steps: z.infer<typeof stepsSchema> }) => (
  <ol className="my-3 space-y-2">
    {steps.map((step, index) => (
      <Step key={index} step={step} />
    ))}
  </ol>
);

const CompareBlock = ({ columns }: { columns: z.infer<typeof compareSchema> }) => (
  <div className="my-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {columns.map((column, index) => (
      <div key={index} className={cn('rounded-lg border px-3 py-2', toneContainer(column.tone))}>
        <p className="mb-1 text-sm font-semibold">{column.title}</p>
        <ul className="space-y-1">
          {column.items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

/** Unparseable input: show the source as a plain, non-code panel, never syntax-highlighted. */
const RawBlock = ({ code }: { code: string }) => (
  <div className="my-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
    <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{code}</pre>
  </div>
);

export const MarkdownRichBlock = ({ language, code }: { language: string; code: string }) => {
  const block = parseBlock(language, code);
  if (!block) return <RawBlock code={code} />;

  if (block.kind === 'stats') return <StatsBlock stats={block.data} />;
  if (block.kind === 'steps') return <StepsBlock steps={block.data} />;
  return <CompareBlock columns={block.data} />;
};
