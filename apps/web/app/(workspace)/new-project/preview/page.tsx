'use client';

import { KickoffPlanList } from '@/components/KickoffPlanList';
import { Button } from '@/components/ui/button';
import { useAiRun } from '@/hooks/useAi';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useCompleteProjectOnboarding, useGetOnboarding } from '@/hooks/useProjects';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const { data: onboarding } = useGetOnboarding();

  const router = useRouter();

  const { mutate: completeOnboarding } = useCompleteProjectOnboarding({
    onSuccess() {
      router.replace('/projects');
      clearDraft();
    },
    onError() {},
  });

  const runId = onboarding?.aiRunId ?? '';
  const projectId = onboarding?.projectId;
  const onboardingId = onboarding?.id;

  const { data: aiRun } = useAiRun(runId);

  const { clear: clearDraft } = useOnboardingDraft();

  const kickoffPlanData = aiRun?.data;

  const disabled = !projectId || !onboardingId || !kickoffPlanData;

  const handleGoBack = () => {
    return router.replace('/new-project');
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

  return (
    <div className="flex flex-col gap-4">
      {kickoffPlanData && <KickoffPlanList plan={kickoffPlanData}></KickoffPlanList>}
      <div className="w-full flex justify-between">
        <Button variant="outline" className="border">
          <ArrowLeft size={18} onClick={handleGoBack}></ArrowLeft>
          Back
        </Button>
        <Button disabled={disabled} onClick={handleCompleteOnboarding}>
          Create workspace <ArrowRight size={18}></ArrowRight>
        </Button>
      </div>
    </div>
  );
}
