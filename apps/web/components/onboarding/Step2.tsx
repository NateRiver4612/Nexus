'use client';

import * as React from 'react';
import { useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingStep2Schema } from '@nexus/zod-schemas';
import type { OnboardingStep2InputType } from '@nexus/types';

import { FormTextArea } from '@/components/FormTextArea';

import type { StepHandle } from './shared';
import { useDraftSync } from './useDraftSync';

type Step2Props = {
  ref?: React.Ref<StepHandle>;
  defaults?: Partial<OnboardingStep2InputType>;
  onSave: (data: OnboardingStep2InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep2InputType>) => void;
};

export function Step2({ ref, defaults, onSave, onDraftChange }: Step2Props) {
  const form = useForm<OnboardingStep2InputType>({
    defaultValues: {
      context: defaults?.context ?? '',
    },
    resolver: zodResolver(onboardingStep2Schema),
  });

  useImperativeHandle(ref, () => ({
    save: async () => {
      await form.trigger();
      const context = form.getValues('context').trim();
      await onSave({ context });
      return true;
    },
  }));

  useDraftSync(form, onDraftChange);

  return (
    <FormProvider {...form}>
      <FormTextArea
        name="context"
        rows={6}
        placeholder="I need to research competitors, identify pricing strategies, and prepare a presentation for leadership."
      />
    </FormProvider>
  );
}
