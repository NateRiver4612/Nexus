'use client';

import type { KickoffPlanType } from '@nexus/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock,
  ListChecks,
  Milestone as MilestoneIcon,
  RotateCw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { KickoffPlanList, kickoffTaskKey } from '@/components/KickoffPlanList';
import AISummary from '@/components/project/AISummary';
import { GenerationProgress } from '@/components/project/GenerationProgress';
import { ProjectResearchSources } from '@/components/project/ProjectResearchSources';
import { RegeneratePlanDialog } from '@/components/project/RegeneratePlanDialog';
import { getCategoryMeta, getLevelMeta } from '@/components/onboarding/stepMeta';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetAiRun } from '@/hooks/useAi';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import {
  useCompleteProjectOnboarding,
  useGetOnboarding,
  useSubmitProjectOnboarding,
} from '@/hooks/useProjects';
import { onboardingKeys, researchKeys } from '@/hooks/queryKeys';
import { useGetProjectResearch, useRemoveProjectResearchSource } from '@/hooks/useResearch';
import { toastError } from '@/lib/toast';
import { cn, formatTimeMinutes, totalEstimatedMinutes } from '@/lib/utils';

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
};

// Compact by default so the plan fits laptop viewports; large monitors get the
// roomier sizing back at `2xl`.
const MetricCard = ({ label, value, icon: Icon, tone }: MetricCardProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 rounded-card px-4 py-3 2xl:gap-3 2xl:px-5 2xl:py-4',
      tone,
    )}
  >
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 2xl:text-[11px]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg 2xl:text-xl">
        {value}
      </p>
    </div>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/70 text-foreground 2xl:size-9">
      <Icon className="size-3.5 2xl:size-4" aria-hidden="true" />
    </span>
  </div>
);

export default function Page() {
  const { data: onboarding } = useGetOnboarding();

  const router = useRouter();
  const queryClient = useQueryClient();

  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [excludedTaskKeys, setExcludedTaskKeys] = useState<Set<string>>(() => new Set());

  const { mutate: completeOnboarding, isPending: isCompletingOnboarding } =
    useCompleteProjectOnboarding({
      onSuccess() {
        router.replace('/projects');

        setTimeout(() => {
          clearDraft();
        }, 4000);
      },
      onError() {},
    });

  const runId = onboarding?.aiRunId ?? '';
  const projectId = onboarding?.projectId;
  const onboardingId = onboarding?.id;

  const { data: aiRun, isLoading: isAiRunLoading } = useGetAiRun({
    variables: runId,
  });

  const { data: projectResearch, isLoading: isResearchLoading } = useGetProjectResearch({
    variables: projectId ?? '',
  });

  const removeSource = useRemoveProjectResearchSource();

  // Research is finalized before plan generation, so once the run completes its
  // row is guaranteed to exist. Refetch it then: the initial request can land
  // before the worker inserts the row and the research query would stay on `null`.
  useEffect(() => {
    if (!projectId || aiRun?.status !== 'completed') return;

    queryClient.invalidateQueries({ queryKey: researchKeys.project(projectId) });
  }, [projectId, aiRun?.status, queryClient]);

  const { clear: clearDraft } = useOnboardingDraft();
  const { mutateAsync: submitOnboarding, isPending: isGenerating } = useSubmitProjectOnboarding();

  // A regenerated plan is a new set of drafts, so stale position keys must not
  // keep tasks excluded in the replacement plan.
  useEffect(() => {
    setExcludedTaskKeys(new Set());
  }, [aiRun?.id]);

  const kickoffPlanData = aiRun?.data;

  const disabled = !projectId || !onboardingId || isCompletingOnboarding || isGenerating;

  const handleGoBack = () => {
    router.replace('/new-project');
  };

  const handleRetry = async () => {
    if (!projectId || !onboardingId) {
      return;
    }

    await submitOnboarding({
      projectId,
      onboardingId: onboarding.id,
    });
  };

  const handleRegenerate = async () => {
    if (!projectId || !onboardingId) {
      return;
    }

    try {
      const { runId } = await submitOnboarding({
        projectId,
        onboardingId,
      });

      queryClient.setQueryData(onboardingKeys.all, (prev) =>
        prev ? { ...prev, aiRunId: runId } : prev,
      );
      setIsRegenerateOpen(false);
    } catch (err) {
      toastError(err);
    }
  };

  /**
   * Drops the tasks the user unchecked. A milestone whose tasks are all excluded is
   * dropped whole — its schema requires at least one task, and creating an empty
   * milestone would be worse than omitting it.
   */
  const buildSelectedPlan = (plan: KickoffPlanType): KickoffPlanType => ({
    summary: plan.summary,
    milestones: plan.milestones.flatMap((milestone, milestoneIndex) => {
      const tasks = milestone.tasks.filter(
        (_, taskIndex) => !excludedTaskKeys.has(kickoffTaskKey({ milestoneIndex, taskIndex })),
      );

      return tasks.length > 0 ? [{ ...milestone, tasks }] : [];
    }),
  });

  const handleCompleteOnboarding = () => {
    if (disabled || !kickoffPlanData) {
      return;
    }

    const plan = buildSelectedPlan(kickoffPlanData);

    if (plan.milestones.length === 0) return;

    completeOnboarding({
      projectId,
      onboardingId,
      plan,
    });
  };

  if (isAiRunLoading || aiRun?.status === 'processing' || aiRun?.status === 'queued') {
    return (
      <div className="w-full flex justify-center h-fit">
        <div className="flex w-130 flex-col items-center justify-center gap-6 rounded-2xl p-10 text-center shadow-xl">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">Building your project plan</p>
            <p className="text-sm text-gray-400">This usually takes a few minutes.</p>
          </div>
          <GenerationProgress stage={aiRun?.stage ?? null} />
        </div>
      </div>
    );
  }

  if (!isAiRunLoading && aiRun?.status === 'failed') {
    return (
      <div className="w-full flex justify-center h-fit">
        <div className="flex w-130 rounded-2xl p-10 shadow-xl flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
            <TriangleAlert className="size-7 text-red-400" strokeWidth={2} />
          </div>

          <div className="max-w-xs space-y-1">
            <p className="text-base font-semibold text-gray-900">Could not generate plan</p>
            <p className="text-sm text-gray-400">
              Something went wrong while generating your plan.Your resources are sill saved.
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Button variant="outline" onClick={handleGoBack} disabled={disabled}>
              Back
            </Button>
            <Button onClick={handleRetry} disabled={disabled}>
              <RotateCw className={cn('size-4', isGenerating && 'animate-spin')} />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stepData = onboarding?.stepData;
  const projectName = stepData?.step1?.name?.trim() || 'Untitled project';
  const categoryMeta = getCategoryMeta(stepData?.step1?.category);
  const levelMeta = getLevelMeta(stepData?.step2?.level);
  const sequenceLabel = kickoffPlanData?.summary?.keywords?.[0]
    ? `${kickoffPlanData.summary.keywords[0]} Sequence`
    : 'Standard Sequence';

  const milestones = kickoffPlanData?.milestones ?? [];
  const totalTasks = milestones.reduce((total, milestone) => total + milestone.tasks.length, 0);
  const selectedTaskCount = Math.max(0, totalTasks - excludedTaskKeys.size);
  const sourceCount = projectResearch?.sources.length ?? 0;
  const totalMinutes = totalEstimatedMinutes(milestones.flatMap((milestone) => milestone.tasks));
  const totalTime = formatTimeMinutes(totalMinutes);
  const canCreate = selectedTaskCount > 0 && !disabled;

  const removalUrl = removeSource.isPending ? (removeSource.variables?.sourceUrl ?? null) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl 2xl:text-3xl">
            {projectName}
          </h1>
          {categoryMeta && (
            <span className="rounded-pill bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
              {categoryMeta.label}
            </span>
          )}
          {levelMeta && (
            <span className="rounded-pill border border-border bg-surface px-3 py-1 text-[11px] font-bold text-foreground">
              {levelMeta.label} · {kickoffPlanData?.summary?.keywords?.[0] ?? 'General'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="2xl:h-10 2xl:px-5 2xl:text-sm"
            onClick={handleGoBack}
            disabled={disabled}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Edit Inputs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="2xl:h-10 2xl:px-5 2xl:text-sm"
            disabled={disabled}
            onClick={() => setIsRegenerateOpen(true)}
          >
            <RotateCw
              className={cn('size-3.5', isGenerating && 'animate-spin')}
              aria-hidden="true"
            />
            Regenerate
          </Button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Milestones"
          value={`${milestones.length} Stages`}
          icon={MilestoneIcon}
          tone="bg-accent"
        />
        <MetricCard
          label="Action Tasks"
          value={`${selectedTaskCount} / ${totalTasks} Selected`}
          icon={ListChecks}
          tone="bg-primary"
        />
        <MetricCard
          label="Grounded Sources"
          value={`${sourceCount} References`}
          icon={BookOpen}
          tone="bg-accent-secondary"
        />
        <MetricCard
          label="Estimated Scope"
          value={totalTime ?? 'No estimates'}
          icon={Clock}
          tone="bg-accent-tertiary-soft"
        />
      </div>

      {/* Only the plan body scrolls — header, metrics, and the action bar stay put. */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 xl:overflow-hidden">
        <div className="grid grid-cols-1 gap-4 xl:h-full xl:min-h-0 xl:grid-cols-[3fr_2fr] xl:items-stretch">
          <KickoffPlanList
            milestones={milestones}
            isLoading={isAiRunLoading}
            sequenceLabel={sequenceLabel}
            onExcludedChange={setExcludedTaskKeys}
            className="min-w-0 xl:h-full"
          />

          <div className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-5 xl:h-full xl:min-h-0">
            <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col gap-0">
              <TabsList className="grid h-auto w-full shrink-0 grid-cols-2 rounded-pill bg-surface-secondary p-1">
                <TabsTrigger
                  value="summary"
                  className="rounded-pill py-2 text-xs font-bold data-[state=active]:bg-action data-[state=active]:text-action-foreground data-[state=active]:shadow-none"
                >
                  Summary &amp; Topics ({kickoffPlanData?.summary.keyTopics.length ?? 0})
                </TabsTrigger>
                <TabsTrigger
                  value="sources"
                  className="rounded-pill py-2 text-xs font-bold data-[state=active]:bg-action data-[state=active]:text-action-foreground data-[state=active]:shadow-none"
                >
                  Grounded Sources ({sourceCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="summary"
                className="no-scrollbar mt-4 min-h-0 min-w-0 flex-1 overflow-y-auto xl:pr-1"
              >
                <AISummary summary={kickoffPlanData?.summary} isLoading={isAiRunLoading} />
              </TabsContent>

              <TabsContent
                value="sources"
                className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              >
                <ProjectResearchSources
                  sources={projectResearch?.sources}
                  isLoading={isResearchLoading}
                  removingUrl={removalUrl}
                  onRemoveSource={(source) => {
                    if (!projectId) return;

                    removeSource.mutate({ projectId, sourceUrl: source.url });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-2 2xl:px-5 2xl:py-3">
        <Button
          variant="ghost"
          size="sm"
          className="2xl:h-10 2xl:px-5 2xl:text-sm"
          onClick={handleGoBack}
          disabled={disabled}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </Button>

        <p className="hidden items-center gap-1.5 text-xs 2xl:text-sm font-medium text-muted-foreground md:flex">
          <CircleCheck className="size-3.5 text-success" aria-hidden="true" />
          Ready to create <span className="font-bold text-foreground">{projectName}</span> with{' '}
          {milestones.length} milestones, {selectedTaskCount} tasks &amp; {sourceCount} sources
        </p>

        <Button
          size="sm"
          className="2xl:h-10 2xl:px-5 2xl:text-sm"
          onClick={handleCompleteOnboarding}
          disabled={!canCreate}
        >
          Create workspace
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <RegeneratePlanDialog
        open={isRegenerateOpen}
        onOpenChange={setIsRegenerateOpen}
        onConfirm={handleRegenerate}
        isPending={isGenerating}
      />
    </div>
  );
}
