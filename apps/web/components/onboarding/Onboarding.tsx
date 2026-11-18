'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Circle, CircleCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import type { OnboardingStateType } from '@nexus/types';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { onboardingKeys } from '@/hooks/queryKeys';
import { useGetKnowledgeSources } from '@/hooks/useKnowledge';
import {
  useGetOnboarding,
  useSaveOnboardingStep,
  useSubmitProjectOnboarding,
} from '@/hooks/useProjects';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { BlueprintPreview } from './BlueprintPreview';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { StepCard, type StepStatusTone } from './StepCard';
import {
  LEVEL_PACE,
  ONBOARDING_STEPS,
  getCategoryMeta,
  getLevelMeta,
  getMilestoneCount,
  type OnboardingStepId,
} from './stepMeta';
import type { StepHandle } from './shared';

const STEP_COUNT = ONBOARDING_STEPS.length;

type StepCompletion = Record<OnboardingStepId, boolean>;

const clampStep = (step: number) => Math.min(Math.max(step, 0), STEP_COUNT - 1);

const OnboardingSkeleton = () => {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-52 rounded-pill" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-14 rounded-card" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    </div>
  );
};

export function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: onboarding, isLoading } = useGetOnboarding();
  const { mutateAsync: saveStep, isPending: isSaving } = useSaveOnboardingStep();
  const { mutateAsync: submitOnboarding, isPending: isGenerating } = useSubmitProjectOnboarding();

  const projectId = onboarding?.projectId;

  const { draft, setStep: setDraftStep, setStepData: setDraftStepData } = useOnboardingDraft();
  const { step: draftStep, stepData: draftStepData } = draft;

  const { data: sources } = useGetKnowledgeSources({ variables: projectId ?? '' });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const identityRef = useRef<StepHandle>(null);
  const goalRef = useRef<StepHandle>(null);
  const sourcesRef = useRef<StepHandle>(null);
  const deliverablesRef = useRef<StepHandle>(null);
  const stepRefs = [identityRef, goalRef, sourcesRef, deliverablesRef];

  const resumed = useRef(false);
  const isRestoring = useIsRestoring();
  const notReady = isRestoring || isLoading;

  useEffect(() => {
    if (notReady || resumed.current) return;

    resumed.current = true;

    if (draftStep !== null) return;

    // Server step is 1-based; the UI index is 0-based and has no review step.
    setDraftStep(clampStep((onboarding?.step ?? 1) - 1));
  }, [notReady, onboarding, draftStep, setDraftStep]);

  const initialStep = clampStep((onboarding?.step ?? 1) - 1);
  const step = clampStep(draftStep ?? initialStep);
  const mergedData = { ...onboarding?.stepData, ...draftStepData };

  const activeSources = (sources ?? []).filter((source) => source.status !== 'failed');
  const deliverables = mergedData.step4?.deliverables ?? [];

  const completion: StepCompletion = {
    identity: Boolean(mergedData.step1?.name?.trim() && mergedData.step1?.category),
    goal: Boolean(mergedData.step2?.context?.trim() && mergedData.step2?.level),
    sources: activeSources.length > 0,
    deliverables: deliverables.length > 0,
  };
  const completedCount = Object.values(completion).filter(Boolean).length;
  const completionPercent = Math.round((completedCount / STEP_COUNT) * 100);

  const categoryMeta = getCategoryMeta(mergedData.step1?.category);
  const levelMeta = getLevelMeta(mergedData.step2?.level);
  const milestones = getMilestoneCount(mergedData.step2?.level);
  const sourceCount = activeSources.length;

  const stepStatuses: Record<OnboardingStepId, { label: string; tone: StepStatusTone }> = {
    identity: completion.identity
      ? { label: 'Identity Ready', tone: 'success' }
      : { label: 'Add project details', tone: 'muted' },
    goal:
      levelMeta && milestones
        ? {
            label: `${levelMeta.label} · ${milestones} Milestones · ${LEVEL_PACE[levelMeta.value]}`,
            tone: 'primary',
          }
        : { label: 'Describe your goal', tone: 'muted' },
    sources: sourceCount
      ? {
          label: `${sourceCount} source${sourceCount === 1 ? '' : 's'} attached`,
          tone: 'secondary',
        }
      : { label: 'No sources yet', tone: 'muted' },
    deliverables: deliverables.length
      ? { label: `${deliverables.length} selected`, tone: 'accent' }
      : { label: 'Nothing selected', tone: 'muted' },
  };

  const isBusy = isSubmitting || isGenerating || isSaving;
  const canGenerate = completedCount === STEP_COUNT && !isBusy;

  const saveStepAt = async (index: number) => {
    const handle = stepRefs[index]?.current;
    if (!handle) return true;

    try {
      const ok = await handle.save();
      if (!ok) {
        setDraftStep(index);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this step.');
      setDraftStep(index);
      return false;
    }
  };

  const saveStepsBefore = async (bound: number) => {
    for (let index = 0; index < bound; index += 1) {
      if (!(await saveStepAt(index))) return false;
    }
    return true;
  };

  const goToStep = async (target: number) => {
    setError(null);
    const next = clampStep(target);

    if (next > step) {
      const ok = await saveStepsBefore(next);
      if (!ok) return;
    }

    setDraftStep(next);
  };

  const saveDraft = async () => {
    setError(null);
    const ok = await saveStepsBefore(STEP_COUNT);
    if (ok) toast.success('Blueprint saved as draft.');
  };

  const handleFinish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const ok = await saveStepsBefore(STEP_COUNT);
      if (!ok) return;

      const state = queryClient.getQueryData<OnboardingStateType>(onboardingKeys.all);
      if (!state?.projectId || !state.id) return;

      if (state.status === 'submitted') {
        router.push('/new-project/preview');
        return;
      }

      const { runId } = await submitOnboarding({
        projectId: state.projectId,
        onboardingId: state.id,
      });

      if (runId) router.push('/new-project/preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (notReady) {
    return <OnboardingSkeleton />;
  }

  const stepBodies = [
    <Step1
      key="identity"
      ref={identityRef}
      defaults={mergedData.step1}
      onSave={async (data) => {
        await saveStep({ step: 1, data });
        setDraftStepData('step1', data);
      }}
      onDraftChange={(data) => setDraftStepData('step1', data)}
    />,
    <Step2
      key="goal"
      ref={goalRef}
      defaults={mergedData.step2}
      onSave={async (data) => {
        await saveStep({ step: 2, data });
        setDraftStepData('step2', data);
      }}
      onDraftChange={(data) => setDraftStepData('step2', data)}
    />,
    <Step3
      key="sources"
      ref={sourcesRef}
      projectId={projectId}
      defaults={mergedData.step3}
      onSave={async (data) => {
        await saveStep({ step: 3, data });
        setDraftStepData('step3', data);
      }}
    />,
    <Step4
      key="deliverables"
      ref={deliverablesRef}
      projectId={projectId}
      defaults={mergedData.step4}
      onSave={async (data) => {
        await saveStep({ step: 4, data });
        setDraftStepData('step4', data);
      }}
      onDraftChange={(data) => setDraftStepData('step4', data)}
    />,
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11px] font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Connected Single-Screen Workflow
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Configure your project in one continuous flow
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Follow the connected spine from{' '}
            <span className="font-semibold text-foreground">01 Identity</span> down to{' '}
            <span className="font-semibold text-foreground">04 Deliverables</span> — each step feeds
            directly into your live AI plan on the right.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-border bg-surface px-4 py-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {ONBOARDING_STEPS.map((item, index) => {
              const done = completion[item.id];
              const active = index === step;

              return (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void goToStep(index)}
                    disabled={isBusy}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      active
                        ? 'border-action bg-action text-action-foreground'
                        : done
                          ? 'border-success/40 bg-success-soft text-success-foreground hover:border-success'
                          : 'border-border bg-surface-secondary text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {done ? (
                      <CircleCheck className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Circle className="size-3.5" aria-hidden="true" />
                    )}
                    <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                    {item.shortTitle}
                  </button>
                  {index < STEP_COUNT - 1 && (
                    <ArrowRight className="size-3.5 text-placeholder" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Step {step + 1} of {STEP_COUNT} active · {completionPercent}% complete
          </p>
        </div>
      </header>

      {error && (
        <p className="rounded-control bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr] xl:items-start">
        <div className="relative isolate flex min-w-0 flex-col gap-4">
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-10 top-6 -z-10 w-px bg-border"
          />
          {ONBOARDING_STEPS.map((item, index) => {
            const isLast = index === STEP_COUNT - 1;
            // Same rules each step's save enforces, kept live by its draft sync.
            const stepReady = completion[item.id];

            return (
              <StepCard
                key={item.id}
                index={index}
                title={item.title}
                description={item.description}
                tone={item.tone}
                status={stepStatuses[item.id]}
                open={index === step}
                disabled={isBusy}
                onToggle={() => void goToStep(index)}
                className="w-full"
                footer={
                  isLast ? (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        All {STEP_COUNT} steps connect into your live blueprint.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="font-bold"
                        disabled={!canGenerate}
                        isLoading={isGenerating || isSubmitting}
                        onClick={() => void handleFinish()}
                      >
                        Complete &amp; Generate Plan
                        {!(isGenerating || isSubmitting) && (
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        {index === 0 && categoryMeta
                          ? `Feeds ${categoryMeta.label} domain lens into Step 02 & 03.`
                          : 'Continues your connected workflow.'}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={cn(
                          'font-semibold',
                          stepReady && 'bg-accent text-action hover:bg-accent/90',
                        )}
                        disabled={isBusy}
                        onClick={() => void goToStep(index + 1)}
                      >
                        Next: {item.nextLabel}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </>
                  )
                }
              >
                {stepBodies[index]}
              </StepCard>
            );
          })}
        </div>

        <BlueprintPreview
          projectName={mergedData.step1?.name}
          category={mergedData.step1?.category}
          level={mergedData.step2?.level}
          goal={mergedData.step2?.context}
          sources={activeSources}
          deliverables={deliverables}
          completion={completion}
          completionPercent={completionPercent}
          canGenerate={canGenerate}
          isGenerating={isGenerating || isSubmitting}
          onGenerate={() => void handleFinish()}
          onSaveDraft={() => void saveDraft()}
        />
      </div>
    </div>
  );
}
