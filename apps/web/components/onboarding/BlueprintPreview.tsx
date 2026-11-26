'use client';

import { ArrowRight, Circle, CircleCheck, Sparkles } from 'lucide-react';
import type { KnowledgeSourceListType, OnboardingStep4InputType } from '@nexus/types';

import { SourceThumbnail } from '@/components/knowledge/SourceThumbnail';
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
  <div className="flex flex-col items-center gap-0.5 rounded-xl bg-surface px-2 py-3 text-center shadow-2xs">
    <span className="text-lg font-extrabold leading-none text-foreground">{value ?? '—'}</span>
    <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
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
  const taskCount =
    milestones === null ? null : milestones * 3 + Math.max(0, deliverables.length - 1) * 2;

  return (
    <aside className="w-full xl:sticky xl:top-4 xl:self-start">
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Live blueprint preview
            </p>
            <p className="truncate text-xl font-extrabold tracking-tight text-foreground">
              {projectName?.trim() || 'Untitled project'}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center rounded-item border border-border bg-surface-secondary px-4 py-2 text-center">
            <span className="text-lg font-extrabold leading-tight text-foreground">
              {completionPercent}%
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">Ready</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categoryMeta && (
            <span className="rounded-pill bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary-foreground">
              {categoryMeta.label}
            </span>
          )}
          {levelMeta && (
            <span className="rounded-pill bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary-foreground">
              {levelMeta.label}
            </span>
          )}
        </div>

        <div className="border-t border-border" />

        <ul className="grid grid-cols-2 gap-2">
          {CHECKLIST.map(({ id, label }) => {
            const done = completion[id];

            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold',
                  done
                    ? 'bg-success-soft text-success-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ul>

        {goal?.trim() && (
          <div className="flex flex-col gap-1.5 rounded-item bg-surface-secondary p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Goal & Starting Context
            </p>
            <p className="line-clamp-5 text-xs font-medium leading-relaxed text-foreground">
              {goal}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Knowledge Sources ({sources.length})
          </p>
          {sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing attached yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sources.slice(0, 4).map((source) => {
                return (
                  <li
                    key={source.id}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5"
                  >
                    <SourceThumbnail source={source} />
                    <span className="truncate text-xs font-bold text-foreground">
                      {source.name || source.sourceRef || 'Untitled source'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {sources.length > 4 && (
            <p className="text-[11px] text-muted-foreground">+{sources.length - 4} more</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Deliverables ({deliverables.length})
          </p>
          {deliverables.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {deliverables.map((deliverable) => (
                <span
                  key={deliverable.id}
                  className="rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold text-accent-foreground"
                >
                  {deliverable.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-item bg-primary-soft/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Estimated AI Execution Plan
            </p>
            <span className="shrink-0 rounded-pill bg-surface px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
              Auto-tailored
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <Metric value={milestones} label="Milestones" />
            <Metric value={taskCount} label="Action Tasks" />
            <Metric value={deliverables.length} label="Artifacts" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full font-bold"
            disabled={!canGenerate}
            isLoading={isGenerating}
            onClick={onGenerate}
          >
            Generate Project Plan
            {!isGenerating && <ArrowRight className="size-4 text-accent" aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            variant="secondary"
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
