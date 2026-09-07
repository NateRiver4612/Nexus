'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { OnboardingDataType } from '@nexus/types';

import { onboardingKeys } from './queryKeys';

type StepKey = keyof Partial<OnboardingDataType>;

type DraftStepData = { [K in StepKey]?: Partial<OnboardingDataType[K]> };

export type OnboardingDraft = {
  /** 0-based wizard position; null until the user starts or hydrates. */
  step: number | null;
  /** Typed/saved step values, overlaid on the server's stepData on load. */
  stepData: DraftStepData;
};

const emptyDraft: OnboardingDraft = { step: null, stepData: {} };

/**
 * Persisted client-side draft of the onboarding wizard. Server state stays in
 * `useGetOnboarding`; this is a write-only query whose data is persisted to
 * localStorage by `persistQueryClient`, so a hard refresh doesn't lose the
 * current step or in-progress values. Cleared once the project is created.
 *
 * Reads via `useQuery` (reactive), writes via functional `setQueryData`
 * (no stale closures).
 */
export function useOnboardingDraft() {
  const queryClient = useQueryClient();

  const { data } = useQuery<OnboardingDraft | null>({
    queryKey: onboardingKeys.draft,
    queryFn: () => null, // never fetches — restored/written from the persisted cache
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const draft = data ?? emptyDraft;

  const setStep = (step: number) =>
    queryClient.setQueryData<OnboardingDraft | null>(onboardingKeys.draft, (old) => {
      const current = old ?? emptyDraft;
      return { ...current, step };
    });

  const setStepData = <K extends StepKey>(key: K, value: Partial<OnboardingDataType[K]>) =>
    queryClient.setQueryData<OnboardingDraft | null>(onboardingKeys.draft, (old) => {
      const current = old ?? emptyDraft;
      return { ...current, stepData: { ...current.stepData, [key]: value } };
    });

  const clear = () => queryClient.setQueryData<OnboardingDraft | null>(onboardingKeys.draft, null);

  return { draft, setStep, setStepData, clear };
}