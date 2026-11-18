'use client';

import { useId, type ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StepCardTone = 'action' | 'primary' | 'secondary' | 'accent';
export type StepStatusTone = 'success' | 'primary' | 'secondary' | 'accent' | 'muted';

type StepStatus = {
  label: string;
  tone?: StepStatusTone;
};

type StepCardProps = {
  index: number;
  tone?: StepCardTone;
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

const BADGE_TONES: Record<StepCardTone, string> = {
  action: 'bg-action text-action-foreground',
  primary: 'bg-primary-soft text-primary-foreground',
  secondary: 'bg-accent-secondary-soft text-accent-secondary-foreground',
  accent: 'bg-accent-soft text-accent-foreground',
};

const STATUS_TONES: Record<StepStatusTone, string> = {
  success: 'bg-success-soft text-success-foreground',
  primary: 'bg-primary-soft text-primary-foreground',
  secondary: 'bg-accent-secondary-soft text-accent-secondary-foreground',
  accent: 'bg-accent-soft text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
};

const StepCardStatus = ({ label, tone = 'muted' }: StepStatus) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-bold',
      STATUS_TONES[tone],
    )}
  >
    {tone === 'success' && <CircleCheck className="size-3" aria-hidden="true" />}
    {label}
  </span>
);

/**
 * One card in the connected onboarding workflow. Collapsed by default; only the
 * current step is opened by the parent. The body stays mounted and animates via
 * a grid-rows slide, so form state and draft sync survive a collapse.
 */
export const StepCard = ({
  index,
  tone = 'primary',
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
        'relative flex min-w-0 flex-col rounded-card border bg-surface p-6 transition-colors',
        open ? 'border-action/60 shadow-xs' : 'border-border shadow-none',
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
            BADGE_TONES[tone],
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base font-bold text-foreground">{title}</span>
          {description && (
            <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
          )}
        </span>

        {status && <StepCardStatus {...status} />}
      </button>

      {/* Grid-rows animation slides the body open/closed while keeping it mounted,
          so RHF state and the draft sync aren't torn down on collapse. */}
      <div
        id={contentId}
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="mt-5">{children}</div>
          {footer && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
