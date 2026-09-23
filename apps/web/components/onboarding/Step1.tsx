'use client';

import * as React from 'react';
import { useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingStep1Schema } from '@nexus/zod-schemas';
import type { OnboardingStep1InputType } from '@nexus/types';

import { FormInput } from '@/components/FormInput';
import { FormTextArea } from '@/components/FormTextArea';
import { CardRadioGroup } from '@/components/CardRadioGroup';
import { DEFAULT_ONBOARDING_CATEGORIES } from '@nexus/zod-schemas/constants';

import type { StepHandle } from './shared';
import { useDraftSync } from './useDraftSync';

type Step1Props = {
  ref?: React.Ref<StepHandle>;
  defaults?: Partial<OnboardingStep1InputType>;
  onSave: (data: OnboardingStep1InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep1InputType>) => void;
};

export function Step1({ ref, defaults, onSave, onDraftChange }: Step1Props) {
  const form = useForm<OnboardingStep1InputType>({
    defaultValues: {
      name: defaults?.name ?? '',
      description: defaults?.description ?? '',
      category: defaults?.category ?? '',
    },
    mode: 'onTouched',
    resolver: zodResolver(onboardingStep1Schema),
  });

  const { trigger, getValues, formState } = form;

  const { isDirty } = formState;

  useImperativeHandle(ref, () => ({
    save: async () => {
      const valid = await trigger();
      if (!valid) return false;

      if (!isDirty) return true;

      const name = getValues('name').trim();
      const description = getValues('description') ?? null;
      const category = getValues('category');

      await onSave({ name, description, category });
      return true;
    },
  }));

  useDraftSync(form, onDraftChange);

  return (
    <FormProvider {...form}>
      <div className="space-y-6 text-left">
        <FormInput name="name" label="Project name" placeholder="Market Research Report" />
        <FormTextArea
          name="description"
          label="Project description"
          placeholder="Describe your project in a few sentences..."
        />
        <CardRadioGroup
          name="category"
          label="Category"
          options={DEFAULT_ONBOARDING_CATEGORIES}
          otherValue="other"
        />
      </div>
    </FormProvider>
  );
}
