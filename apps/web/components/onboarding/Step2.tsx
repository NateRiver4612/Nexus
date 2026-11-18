'use client';

import { useImperativeHandle, type Ref } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingStep2Schema } from '@nexus/zod-schemas';
import type { OnboardingStep2InputType } from '@nexus/types';
import { ONBOARDING_LEVELS } from '@nexus/zod-schemas/constants';

import { FormTextArea } from '@/components/FormTextArea';
import {
  CardRadioGroup,
  type CardRadioOption,
  type CardRadioTone,
} from '@/components/CardRadioGroup';

import type { StepHandle } from './shared';
import { useDraftSync } from './useDraftSync';
import { LEVEL_PACE, getMilestoneCount } from './stepMeta';

type Step2Props = {
  ref?: Ref<StepHandle>;
  defaults?: Partial<OnboardingStep2InputType>;
  onSave: (data: OnboardingStep2InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep2InputType>) => void;
};

const LEVEL_TONES: Record<string, CardRadioTone> = {
  beginner: 'amber',
  intermediate: 'amber',
  advanced: 'violet',
};

const levelOptions: CardRadioOption[] = ONBOARDING_LEVELS.map((level) => ({
  value: level.value,
  label: level.label,
  description: level.description,
  icon: level.icon,
  tone: LEVEL_TONES[level.value] ?? 'slate',
  meta: `${getMilestoneCount(level.value) ?? 0} Milestones · ${LEVEL_PACE[level.value]}`,
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
      <div className="space-y-6 text-left">
        <FormTextArea
          name="context"
          label="What are you trying to accomplish?"
          rows={6}
          placeholder="I need to research competitors, identify pricing strategies, and prepare a presentation for leadership."
        />
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
