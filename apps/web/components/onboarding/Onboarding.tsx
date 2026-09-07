'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useIsRestoring } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCreateProject, useGetOnboarding, useSaveOnboardingStep } from '@/hooks/useProjects';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { Step5 } from './Step5';
import { slugify, type StepHandle } from './shared';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    title: "Let's start your project",
    description: 'A name and category is all we need to get going.',
  },
  {
    title: 'What are you trying to accomplish?',
    description: 'Describe your goal in your own words.',
  },
  {
    title: 'Context & Resources',
    description: 'Add everything you already have.Nexus will index it for the project assistance.',
  },
  { title: 'Plan your work', description: 'Add the tasks and deliverables to get there.' },
  { title: 'Review and create', description: "Everything looks good. Let's build your project." },
];

export function Onboarding() {
  const router = useRouter();
  const { data: onboarding, isLoading } = useGetOnboarding();
  const { mutateAsync: saveStep, isPending } = useSaveOnboardingStep();
  const createProject = useCreateProject();

  const {
    draft,
    setStep: setDraftStep,
    setStepData: setDraftStepData,
    clear: clearDraft,
  } = useOnboardingDraft();
  const draftStep = draft.step;
  const draftStepData = draft.stepData;

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepRef = useRef<StepHandle>(null);
  const resumed = useRef(false);

  // Wait for both the restored draft (persistQueryClient) and the server GET so
  // the resolved step is deterministic — otherwise a refresh flashes Step 1, and
  // a returning user on a fresh browser could lock in step 0 before the server
  // step arrives.
  const isRestoring = useIsRestoring();
  const notReady = isRestoring || isLoading;

  useEffect(() => {
    if (notReady || resumed.current) return;
    resumed.current = true;
    if (draftStep !== null) return;
    // First load: resume from the saved server step (1-based) if there is one.
    setDraftStep(onboarding ? Math.min(onboarding.step, steps.length - 1) : 0);
  }, [notReady, onboarding, draftStep, setDraftStep]);

  const step = draftStep ?? 0;
  const isLast = step === steps.length - 1;
  const current = steps[step]!;
  // Draft overlays server-backed stepData so in-progress edits survive refreshes.
  const mergedData = { ...onboarding?.stepData, ...draftStepData };

  if (notReady) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border-border bg-card p-8">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-10 min-h-40 animate-pulse rounded-lg bg-muted/50" />
      </div>
    );
  }

  async function handleFinish() {
    const draftStep1 = draftStepData.step1;
    const name = draftStep1?.name ?? onboarding?.name ?? 'Untitled Project';
    const description = draftStep1?.description ?? onboarding?.stepData?.step1?.description ?? null;
    setCreating(true);
    try {
      const project = await createProject.mutateAsync({
        name,
        slug: slugify(name),
        description,
      });
      clearDraft();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
      setCreating(false);
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
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-primary' : 'bg-muted',
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
        {step === 2 && <Step3 />}
        {step === 3 && (
          <Step4
            ref={stepRef}
            defaults={mergedData.step4}
            onSave={async (data) => {
              await saveStep({ step: 4, data });
              setDraftStepData('step4', data);
            }}
            onDraftChange={(data) => setDraftStepData('step4', data)}
          />
        )}
        {step === 4 && <Step5 state={onboarding} />}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraftStep(Math.max(0, step - 1))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        <Button type="button" onClick={handleNext} disabled={creating || isPending}>
          {creating ? 'Creating…' : isLast ? 'Finish' : 'Continue'}
          {!creating && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
