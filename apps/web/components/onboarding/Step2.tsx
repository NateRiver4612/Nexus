'use client';

import * as React from 'react';
import { useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingStep2Schema } from '@nexus/zod-schemas';
import type { OnboardingStep2InputType } from '@nexus/types';
import { ONBOARDING_LEVELS } from '@nexus/zod-schemas/constants';

import { FormTextArea } from '@/components/FormTextArea';

import type { StepHandle } from './shared';
import { useDraftSync } from './useDraftSync';
import { CardRadioGroup, type CardRadioOption } from '../CardRadioGroup';

type Step2Props = {
  ref?: React.Ref<StepHandle>;
  defaults?: Partial<OnboardingStep2InputType>;
  onSave: (data: OnboardingStep2InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep2InputType>) => void;
};

const levelOptions: CardRadioOption[] = ONBOARDING_LEVELS.map((level) => ({
  value: level.value,
  label: level.label,
  description: level.description,
  icon: level.icon,
}));

export function Step2({ ref, defaults, onSave, onDraftChange }: Step2Props) {
  const form = useForm<OnboardingStep2InputType>({
    defaultValues: {
      context: defaults?.context ?? '',
      level: defaults?.level,
    },
    resolver: zodResolver(onboardingStep2Schema),
  });

  const {
    formState: { isDirty },
  } = form;

  useImperativeHandle(ref, () => ({
    save: async () => {
      const valid = await form.trigger();
      if (!valid) return false;

      if (!isDirty) {
        return true;
      }

      const context = form.getValues('context').trim();
      const level = form.getValues('level');
      await onSave({ context, level });
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
      <div>
        <CardRadioGroup
          name="level"
          label="Where are you starting from?"
          options={levelOptions}
          layout="column"
          gridClassName="sm:grid-cols-3"
        />
      </div>
    </FormProvider>
  );
}