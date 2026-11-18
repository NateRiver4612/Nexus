'use client';

import { useId, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StepStatusTone = 'ready' | 'accent' | 'muted';

type StepStatus = {
  label: string;
  tone?: StepStatusTone;
};

type StepCardProps = {
  index: number;
  title: string;
  description?: string;
  status?: StepStatus;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const STATUS_TONES: Record<StepStatusTone, string> = {
  ready: 'bg-primary-soft text-primary-foreground',
  accent: 'bg-accent-soft text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
};

const StepCardStatus = ({ label, tone = 'muted' }: StepStatus) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold',
      STATUS_TONES[tone],
    )}
  >
    {tone === 'ready' ? (
      <Check className="size-3" aria-hidden="true" />
    ) : (
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
    )}
    {label}
  </span>
);

/**
 * One card in the connected onboarding workflow. Collapsed by default; only the
 * current step is opened by the parent. `children` stay mounted while collapsed
 * (hidden from the tab order) so each step's form state and draft sync survive
 * a collapse.
 */
export const StepCard = ({
  index,
  title,
  description,
  status,
  open,
  disabled,
  onToggle,
  children,
  footer,
  className,
}: StepCardProps) => {
  const contentId = useId();

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-card border border-border bg-surface p-5',
        open ? 'shadow-xs' : 'shadow-none',
        disabled && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-start gap-3 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70 disabled:cursor-not-allowed"
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
            open ? 'bg-action text-action-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-foreground">{title}</span>
            {status && <StepCardStatus {...status} />}
          </span>
          {description && (
            <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
          )}
        </span>

        <ChevronDown
          className={cn(
            'mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div id={contentId} hidden={!open} className="mt-5">
        {children}
      </div>

      {open && footer && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {footer}
        </div>
      )}
    </section>
  );
};
