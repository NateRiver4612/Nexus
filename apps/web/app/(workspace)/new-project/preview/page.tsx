'use client';

import { KickoffPlanList } from '@/components/KickoffPlanList';
import { Button } from '@/components/ui/button';
import { useGetAiRun } from '@/hooks/useAi';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import {
  useCompleteProjectOnboarding,
  useGetOnboarding,
  useSubmitProjectOnboarding,
} from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, LoaderCircle, RotateCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const { data: onboarding } = useGetOnboarding();

  const router = useRouter();

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

  const { clear: clearDraft } = useOnboardingDraft();
  const { mutateAsync: submitOnboarding, isPending: isGenerating } = useSubmitProjectOnboarding();

  const kickoffPlanData = aiRun?.data;

  const disabled =
    !projectId || !onboardingId || !kickoffPlanData || isCompletingOnboarding || isGenerating;

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

  const handleCompleteOnboarding = () => {
    if (disabled) {
      return;
    }

    completeOnboarding({
      projectId,
      onboardingId,
      plan: kickoffPlanData,
    });
  };

  if (isAiRunLoading || aiRun?.status === 'processing') {
    return (
      <div className="w-full flex justify-center h-[80vh]">
        <div className="flex h-[35%] w-[50%] rounded-2xl shadow-xl flex-col items-center justify-center gap-4 text-center">
          <LoaderCircle className="size-16 animate-spin text-primary" strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">Building your project plan</p>
            <p className="text-sm text-gray-400">This usually takes a few minutes.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAiRunLoading && aiRun?.status === 'failed') {
    return (
      <div className="w-full flex justify-center h-[80vh]">
        <div className="flex h-[30%] w-[50%] rounded-2xl shadow-xl flex-col items-center justify-center gap-4 text-center">
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
      {kickoffPlanData && <KickoffPlanList plan={kickoffPlanData}></KickoffPlanList>}
      <div className="w-full flex justify-between">
        <Button variant="outline" disabled={disabled} onClick={handleGoBack} className="border">
          <ArrowLeft size={18}></ArrowLeft>
          Back
        </Button>
        <Button disabled={disabled} onClick={handleCompleteOnboarding}>
          Create workspace <ArrowRight size={18}></ArrowRight>
        </Button>
      </div>
    </div>
  );
}
