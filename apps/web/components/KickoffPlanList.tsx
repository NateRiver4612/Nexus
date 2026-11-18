'use client';

import type { KickoffPlanType } from '@nexus/types';
import { ArrowLeft, ArrowRight, Maximize2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { cn, formatTimeMinutes, totalEstimatedMinutes } from '@/lib/utils';

import { MilestoneDetail } from './MilestoneDetail';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Skeleton } from './ui/skeleton';

type Milestone = KickoffPlanType['milestones'][number];

/**
 * Kickoff drafts have no ids until the plan is persisted, so selection is keyed by
 * position. Both the roadmap and the submit step need the same key.
 */
export const kickoffTaskKey = ({
  milestoneIndex,
  taskIndex,
}: {
  milestoneIndex: number;
  taskIndex: number;
}) => `${milestoneIndex}:${taskIndex}`;

const MILESTONE_TONES = [
  'bg-primary-soft text-primary-foreground',
  'bg-accent-secondary-soft text-accent-secondary-foreground',
  'bg-accent-soft text-accent-foreground',
  'bg-accent-tertiary-soft text-accent-tertiary-foreground',
  'bg-primary text-primary-foreground',
] as const;

type KickoffPlanListProps = {
  milestones?: KickoffPlanType['milestones'];
  className?: string;
  isLoading?: boolean;
  /** Shown beside the title, e.g. "Stdlib-First Sequence". */
  sequenceLabel?: string;
  /** Fires with the keys of unchecked tasks; the caller drops them from the created plan. */
  onExcludedChange?: (excluded: Set<string>) => void;
};

type MilestonePillProps = {
  index: number;
  milestone: Milestone;
  active: boolean;
  selectedCount: number;
  onClick: () => void;
};

const MilestonePill = ({
  index,
  milestone,
  active,
  selectedCount,
  onClick,
}: MilestonePillProps) => {
  const duration = formatTimeMinutes(totalEstimatedMinutes(milestone.tasks));
  const total = milestone.tasks.length;
  const tone = MILESTONE_TONES[index % MILESTONE_TONES.length] ?? MILESTONE_TONES[0];
  const willBeRemoved = selectedCount === 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={willBeRemoved ? `${milestone.title} — will be removed` : undefined}
      onClick={onClick}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-2 rounded-item border p-3 text-left transition-all',
        active
          ? 'border-action bg-action text-action-foreground shadow-sm'
          : 'border-border bg-surface text-foreground hover:border-foreground/20 hover:shadow-xs',
        willBeRemoved && !active && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
            active ? 'bg-accent text-accent-foreground' : tone,
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {duration && (
          <span
            className={cn(
              'text-[11px] font-semibold tabular-nums',
              active ? 'text-action-foreground/70' : 'text-muted-foreground',
            )}
          >
            {duration}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-xs font-bold leading-snug',
            willBeRemoved && 'text-muted-foreground line-through',
          )}
        >
          {milestone.title}
        </p>
        <p
          className={cn(
            'mt-0.5 text-[11px] font-semibold tabular-nums',
            active ? 'text-accent' : 'text-muted-foreground',
          )}
        >
          {selectedCount}/{total} tasks
        </p>
        {willBeRemoved && (
          <span
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-bold',
              active
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            <TriangleAlert className="size-3" aria-hidden="true" />
            Will be removed
          </span>
        )}
      </div>
    </button>
  );
};

const KickoffPlanListSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-card border border-border bg-surface p-6',
        className,
      )}
    >
      <Skeleton className="h-6 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-24 rounded-item" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-item" />
    </div>
  );
};

export const KickoffPlanList = ({
  milestones = [],
  className,
  isLoading,
  sequenceLabel,
  onExcludedChange,
}: KickoffPlanListProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return <KickoffPlanListSkeleton className={className} />;
  }

  const activeMilestone = milestones[Math.min(activeIndex, milestones.length - 1)];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= milestones.length - 1;

  const isSelected = (milestoneIndex: number, taskIndex: number) =>
    !excluded.has(kickoffTaskKey({ milestoneIndex, taskIndex }));

  // One predicate for both the pill count and the "will be removed" state.
  const selectedCountFor = (milestoneIndex: number, milestone: Milestone) =>
    milestone.tasks.filter((_, taskIndex) => isSelected(milestoneIndex, taskIndex)).length;

  const toggleTask = (key: string) => {
    const next = new Set(excluded);

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    setExcluded(next);
    onExcludedChange?.(next);
  };

  const activeDuration = activeMilestone
    ? formatTimeMinutes(totalEstimatedMinutes(activeMilestone.tasks))
    : null;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col gap-5 rounded-card border border-border bg-surface p-6',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Milestones &amp; Tasks Roadmap
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select any milestone pill below to inspect tasks or toggle items before creating.
          </p>
        </div>
        {sequenceLabel && (
          <span className="rounded-pill border border-border bg-surface-secondary px-3 py-1 text-[11px] font-bold text-foreground">
            {sequenceLabel}
          </span>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {milestones.map((milestone, index) => (
            <MilestonePill
              key={`${milestone.title}-${index}`}
              index={index}
              milestone={milestone}
              active={index === activeIndex}
              selectedCount={selectedCountFor(index, milestone)}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}

      {activeMilestone ? (
        <div className="flex min-h-0 flex-1 flex-col rounded-item border border-border bg-surface-secondary p-4">
          <MilestoneDetail
            milestone={activeMilestone}
            index={activeIndex}
            isSelected={(taskIndex) => isSelected(activeIndex, taskIndex)}
            onToggleTask={(taskIndex) =>
              toggleTask(kickoffTaskKey({ milestoneIndex: activeIndex, taskIndex }))
            }
            clampDescription
            className="min-h-0 flex-1"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
                <Maximize2 className="size-3.5" aria-hidden="true" />
                View details
              </Button>
            }
          />
        </div>
      ) : (
        <div className="rounded-item border border-dashed border-border bg-surface-secondary p-8 text-center text-sm text-muted-foreground">
          No milestones have been generated yet.
        </div>
      )}

      {milestones.length > 1 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-4 text-xs font-bold">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Previous Milestone
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() =>
              setActiveIndex((current) => Math.min(milestones.length - 1, current + 1))
            }
            className="inline-flex cursor-pointer items-center gap-1.5 text-foreground transition-colors hover:text-action-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next Milestone ({String(activeIndex + 2).padStart(2, '0')})
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
          <div className="shrink-0">
            <DialogHeader>
              <DialogTitle className="pr-8">{activeMilestone?.title ?? 'Milestone'}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2 text-left">
                  <span className="rounded-pill bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                    Milestone {String(activeIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {activeMilestone?.tasks.length ?? 0} tasks
                    {activeDuration && ` · ${activeDuration}`}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>

            {activeMilestone?.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {activeMilestone.description}
              </p>
            )}
          </div>

          {activeMilestone && (
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <MilestoneDetail
                milestone={activeMilestone}
                index={activeIndex}
                isSelected={(taskIndex) => isSelected(activeIndex, taskIndex)}
                onToggleTask={(taskIndex) =>
                  toggleTask(kickoffTaskKey({ milestoneIndex: activeIndex, taskIndex }))
                }
                showHeader={false}
                scrollTasks={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
