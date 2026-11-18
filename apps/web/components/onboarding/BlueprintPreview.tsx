'use client';

import { ArrowRight, Check, Circle, Sparkles } from 'lucide-react';
import type { KnowledgeSourceListType, OnboardingStep4InputType } from '@nexus/types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getCategoryMeta,
  getLevelMeta,
  getMilestoneCount,
  type OnboardingStepId,
} from './stepMeta';

type StepCompletion = Record<OnboardingStepId, boolean>;

type BlueprintPreviewProps = {
  projectName?: string;
  category?: string;
  level?: string;
  goal?: string;
  sources: KnowledgeSourceListType;
  deliverables: OnboardingStep4InputType['deliverables'];
  completion: StepCompletion;
  completionPercent: number;
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onSaveDraft: () => void;
};

const CHECKLIST: { id: OnboardingStepId; label: string }[] = [
  { id: 'identity', label: 'Project Name & Category' },
  { id: 'goal', label: 'Goal & Starting Track' },
  { id: 'sources', label: 'Knowledge Sources' },
  { id: 'deliverables', label: 'Target Deliverables' },
];

const Metric = ({ value, label }: { value: number | null; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-base font-bold text-foreground">{value ?? '—'}</span>
    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
  </div>
);

/** Sticky summary of everything entered so far — the only review surface. */
export const BlueprintPreview = ({
  projectName,
  category,
  level,
  goal,
  sources,
  deliverables,
  completion,
  completionPercent,
  canGenerate,
  isGenerating,
  onGenerate,
  onSaveDraft,
}: BlueprintPreviewProps) => {
  const categoryMeta = getCategoryMeta(category);
  const levelMeta = getLevelMeta(level);
  const milestones = getMilestoneCount(level);
  const taskCount = milestones === null ? null : milestones * 3 + deliverables.length;

  return (
    <aside className="w-full xl:sticky xl:top-4 xl:self-start">
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Live blueprint preview
            </p>
            <p className="truncate text-lg font-bold text-foreground">
              {projectName?.trim() || 'Untitled project'}
            </p>
          </div>

          <div
            className="grid size-16 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${completionPercent}%, var(--muted) ${completionPercent}% 100%)`,
            }}
          >
            <div className="flex size-14 flex-col items-center justify-center rounded-full bg-surface">
              <span className="text-sm font-bold text-foreground">{completionPercent}%</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categoryMeta && (
            <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              {categoryMeta.label}
            </span>
          )}
          {levelMeta && (
            <span className="rounded-pill bg-accent-secondary-soft px-2.5 py-1 text-[11px] font-semibold text-accent-secondary-foreground">
              {levelMeta.label}
            </span>
          )}
        </div>

        <ul className="grid grid-cols-2 gap-2">
          {CHECKLIST.map(({ id, label }) => {
            const done = completion[id];

            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-1.5 rounded-control px-2.5 py-2 text-[11px] font-medium',
                  done
                    ? 'bg-primary-soft text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-3 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="size-3 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ul>

        {goal?.trim() && (
          <div className="flex flex-col gap-1.5 rounded-item bg-muted/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Goal & Starting Context
            </p>
            <p className="line-clamp-5 text-xs leading-relaxed text-foreground">{goal}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Knowledge Sources ({sources.length})
          </p>
          {sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing attached yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sources.slice(0, 4).map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-2 rounded-control border border-border bg-surface-secondary px-2.5 py-1.5"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {source.name || source.sourceRef || 'Untitled source'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {sources.length > 4 && (
            <p className="text-[11px] text-muted-foreground">+{sources.length - 4} more</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Deliverables ({deliverables.length})
          </p>
          {deliverables.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {deliverables.map((deliverable) => (
                <span
                  key={deliverable.id}
                  className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"
                >
                  {deliverable.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-item border border-primary/30 bg-primary-subtle p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Estimated AI Execution Plan
            </p>
            <span className="shrink-0 rounded-pill bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Auto-tailored
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            <Metric value={milestones} label="Milestones" />
            <Metric value={taskCount} label="Action Tasks" />
            <Metric value={deliverables.length} label="Artifacts" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canGenerate}
            isLoading={isGenerating}
            onClick={onGenerate}
          >
            Generate Project Plan
            {!isGenerating && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={isGenerating}
            onClick={onSaveDraft}
          >
            Save Blueprint as Draft
          </Button>
        </div>
      </div>
    </aside>
  );
};
