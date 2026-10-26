import type { RunStageType } from '@nexus/types';
import { Check, LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type GenerationProgressProps = {
  stage: RunStageType | null;
  className?: string;
};

/** The kickoff phases, in order, as the checklist the user watches. */
const KICKOFF_STEPS = [
  { stage: 'researching', label: 'Researching sources' },
  { stage: 'drafting_milestones', label: 'Drafting your milestones' },
  { stage: 'drafting_summary', label: 'Drafting your summary' },
] as const satisfies ReadonlyArray<{ stage: RunStageType; label: string }>;

export const GenerationProgress = ({ stage, className }: GenerationProgressProps) => {
  const isRetrying = stage === 'retrying';

  // `findIndex` is -1 while queued (stage null) or retrying — fall back to the
  // first step so the checklist still reads as "starting/restarting".
  const currentIndex = KICKOFF_STEPS.findIndex((step) => step.stage === stage);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ol className="flex flex-col gap-3">
        {KICKOFF_STEPS.map((step, index) => {
          const isDone = currentIndex >= 0 && index < currentIndex;
          const isActive = index === (currentIndex >= 0 ? currentIndex : 0) && !isDone;

          return (
            <li key={step.stage} className="flex items-center gap-3">
              {isDone ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                </span>
              ) : isActive ? (
                <LoaderCircle
                  className="size-6 shrink-0 animate-spin text-primary"
                  strokeWidth={1.5}
                />
              ) : (
                <span className="size-6 shrink-0 rounded-full border-2 border-muted" />
              )}

              <span
                className={cn(
                  'text-sm',
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {isRetrying && <p className="text-xs text-amber-600">Something went wrong — retrying…</p>}
    </div>
  );
};
