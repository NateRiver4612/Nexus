'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { OnboardingDataType } from '@nexus/types';

import { onboardingKeys } from './queryKeys';

type StepKey = keyof Partial<OnboardingDataType>;

type DraftStepData = { [K in StepKey]?: Partial<OnboardingDataType[K]> };

export type OnboardingDraft = {
  step: number | null;
  projectId: string | null;
  stepData: DraftStepData;
};

const emptyDraft: OnboardingDraft = { step: null, stepData: {}, projectId: null };

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

  const { data } = useQuery<OnboardingDraft>({
    queryKey: onboardingKeys.draft,
    queryFn: () => emptyDraft, // never invoked — enabled: false guarantees this
    enabled: false,
    initialData: emptyDraft,
    staleTime: Infinity, // never considered stale — there's no server to compare against
    gcTime: Infinity, // never garbage-collected while the app is open
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
