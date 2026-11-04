'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useIsRestoring } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useSubmitProjectOnboarding,
  useGetOnboarding,
  useSaveOnboardingStep,
} from '@/hooks/useProjects';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { Step5 } from './Step5';
import { type StepHandle } from './shared';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    title: "Let's start your project",
    description: 'A name and category is all we need to get going.',
  },
  {
    title: 'What are you trying to accomplish?',
    description:
      "Describe your goal in your own words — a little about your background helps Nexus tailor the plan to where you're actually starting from.",
  },
  {
    title: 'Context & Resources',
    description: 'Add everything you already have.Nexus will index it for the project assistance.',
  },
  {
    title: 'What deliverables for your need',
    description: 'Select the output you want - Nexus will prepare them as the project progress.',
  },
  {
    title: 'Review and generate',
    description: "Everything looks good. Let's generate your plan.",
  },
];

const OnboardingSkeleton = () => {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border-border bg-card p-8">
      <Skeleton className="h-5 w-24" />
      <div className="mt-3 flex gap-1.5">
        {steps.map((_, index) => (
          <Skeleton key={index} className="h-1 flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-6 h-7 w-64" />
      <Skeleton className="mt-1 h-6 w-3/4" />
      <Skeleton className="mt-8 min-h-40 rounded-lg" />
      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
};

export function Onboarding() {
  const router = useRouter();
  const { data: onboarding, isLoading } = useGetOnboarding();

  const { mutateAsync: saveStep, isPending: isSaving } = useSaveOnboardingStep();

  const { mutateAsync: submitOnboarding, isPending: isGenerating } = useSubmitProjectOnboarding();

  const projectId = onboarding?.projectId;

  const { draft, setStep: setDraftStep, setStepData: setDraftStepData } = useOnboardingDraft();

  const draftStep = draft.step;
  const draftStepData = draft.stepData;

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const stepRef = useRef<StepHandle>(null);
  const resumed = useRef(false);

  const isRestoring = useIsRestoring();
  const notReady = isRestoring || isLoading;

  useEffect(() => {
    if (notReady || resumed.current) return;

    resumed.current = true;

    if (draftStep !== null) return;

    setDraftStep(onboarding?.step ?? 0);
  }, [notReady, onboarding, draftStep, setDraftStep]);

  const step = draftStep ?? 0;
  const isLast = step === steps.length - 1;
  const current = steps[step]!;

  const mergedData = { ...onboarding?.stepData, ...draftStepData };

  if (notReady) {
    return <OnboardingSkeleton />;
  }

  async function handleFinish() {
    setIsSubmitting(true);
    try {
      if (!projectId || !onboarding.id) {
        return;
      }

      if (onboarding.status === 'submitted') {
        return router.push('/new-project/preview');
      }

      const { runId } = await submitOnboarding({
        projectId,
        onboardingId: onboarding.id,
      });

      if (runId) {
        router.push('/new-project/preview');

        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
    }
  }

  async function handleNext() {
    setError(null);
    if (!isLast && stepRef.current) {
      const ok = await stepRef.current.save();
      if (!ok) return;
    }
    if (isLast) {
      await handleFinish();
      return;
    }
    setDraftStep(step + 1);
  }

  const isDisabled = isSubmitting || isGenerating || isSaving;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto w-full max-w-3xl rounded-xl border-border bg-card p-8"
    >
      <p className="text-sm text-muted-foreground">
        Step {step + 1} of {steps.length}
      </p>

      <div className="mt-3 flex gap-1.5">
        {steps.map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-primary/70' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <h2 className="mt-6 text-xl font-bold">{current.title}</h2>
      <p className="mt-1 font-medium text-muted-foreground">{current.description}</p>

      <div className="mt-8 min-h-40 rounded-lg border-border border-dashed text-center text-sm text-muted-foreground">
        {step === 0 && (
          <Step1
            ref={stepRef}
            defaults={mergedData.step1}
            onSave={async (data) => {
              await saveStep({ step: 1, data });
              setDraftStepData('step1', data);
            }}
            onDraftChange={(data) => setDraftStepData('step1', data)}
          />
        )}
        {step === 1 && (
          <Step2
            ref={stepRef}
            defaults={mergedData.step2}
            onSave={async (data) => {
              await saveStep({ step: 2, data });
              setDraftStepData('step2', data);
            }}
            onDraftChange={(data) => setDraftStepData('step2', data)}
          />
        )}
        {step === 2 && (
          <Step3
            ref={stepRef}
            projectId={projectId}
            defaults={mergedData.step3}
            onSave={async (data) => {
              await saveStep({ step: 3, data });
              setDraftStepData('step3', data);
            }}
          />
        )}
        {step === 3 && (
          <Step4
            ref={stepRef}
            projectId={projectId}
            defaults={mergedData.step4}
            onSave={async (data) => {
              await saveStep({ step: 4, data });
              setDraftStepData('step4', data);
            }}
          />
        )}
        {step === 4 && projectId && <Step5 state={onboarding} projectId={onboarding?.projectId} />}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={() => setDraftStep(Math.max(0, step - 1))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        <Button type="button" onClick={handleNext} disabled={isDisabled}>
          {isGenerating ? 'Submiting…' : isLast ? 'Generate plan' : 'Continue'}
          {!isGenerating && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
