'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, RotateCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { KickoffPlanList } from '@/components/KickoffPlanList';
import AISummary from '@/components/project/AISummary';
import { GenerationProgress } from '@/components/project/GenerationProgress';
import { ProjectResearchSources } from '@/components/project/ProjectResearchSources';
import { RegeneratePlanDialog } from '@/components/project/RegeneratePlanDialog';
import { Button } from '@/components/ui/button';
import { useGetAiRun } from '@/hooks/useAi';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import {
  useCompleteProjectOnboarding,
  useGetOnboarding,
  useSubmitProjectOnboarding,
} from '@/hooks/useProjects';
import { onboardingKeys, researchKeys } from '@/hooks/queryKeys';
import { useGetProjectResearch } from '@/hooks/useResearch';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';

export default function Page() {
  const { data: onboarding } = useGetOnboarding();

  const router = useRouter();
  const queryClient = useQueryClient();

  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);

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

  // Research is finalized before plan generation, so once the run completes its
  // row is guaranteed to exist. Refetch it then: the initial request can land
  // before the worker inserts the row and the research query would stay on `null`.
  useEffect(() => {
    if (!projectId || aiRun?.status !== 'completed') return;

    queryClient.invalidateQueries({ queryKey: researchKeys.project(projectId) });
  }, [projectId, aiRun?.status, queryClient]);

  const { clear: clearDraft } = useOnboardingDraft();
  const { mutateAsync: submitOnboarding, isPending: isGenerating } = useSubmitProjectOnboarding();

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

  const handleCompleteOnboarding = () => {
    if (disabled || !kickoffPlanData) {
      return;
    }

    completeOnboarding({
      projectId,
      onboardingId,
      plan: kickoffPlanData,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-400">Summary</h2>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            aria-label="Regenerate plan"
            title="Regenerate plan"
            disabled={disabled}
            onClick={() => setIsRegenerateOpen(true)}
          >
            <RotateCw className={cn('size-4', isGenerating && 'animate-spin')} />
          </Button>
        </div>
        <AISummary summary={kickoffPlanData?.summary} isLoading={isAiRunLoading}></AISummary>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-gray-400">Milestones & Tasks</h2>
        <KickoffPlanList
          milestones={kickoffPlanData?.milestones}
          isLoading={isAiRunLoading}
        ></KickoffPlanList>
        <ProjectResearchSources sources={projectResearch?.sources} isLoading={isResearchLoading} />
        <p className="px-1 text-xs text-muted-foreground">
          Want more sources? You can generate more after creating the project.
        </p>
      </div>
      <div className="w-full flex justify-between">
        <Button variant="outline" disabled={disabled} onClick={handleGoBack} className="border">
          <ArrowLeft size={18}></ArrowLeft>
          Back
        </Button>
        <Button disabled={disabled} onClick={handleCompleteOnboarding}>
          Create workspace <ArrowRight size={18}></ArrowRight>
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
