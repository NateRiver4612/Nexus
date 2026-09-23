'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import type { OnboardingStep4InputType } from '@nexus/types';

import { Skeleton } from '@/components/ui/skeleton';
import {
  CardCheckboxGroup,
  type CardCheckboxOption,
  type CardCheckboxValue,
} from '@/components/CardCheckboxGroup';
import { useCreateDeliverable, useGetDeliverables } from '@/hooks/useDeliverables';

import type { StepHandle } from './shared';
import { DELIVERABLE_KIND_ICONS } from '@nexus/zod-schemas/constants';

type Step4Props = {
  ref?: React.Ref<StepHandle>;
  projectId?: string;
  defaults?: Partial<OnboardingStep4InputType>;
  onSave: (data: OnboardingStep4InputType) => Promise<unknown>;
};

// The card group keeps { label, value: rowId }; stepData stores { id, name } — mapped on save.
type Step4Form = { deliverables: CardCheckboxValue[] };

export function Step4({ ref, projectId, defaults, onSave }: Step4Props) {
  const { data: deliverables, isLoading } = useGetDeliverables({
    variables: projectId,
  });
  const createDeliverable = useCreateDeliverable();

  const form = useForm<Step4Form>({
    defaultValues: {
      // Restore the last-saved selection like steps 1–3 (ids are real row ids).
      deliverables: (defaults?.deliverables ?? []).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    },
  });

  const {
    formState: { isDirty },
  } = form;

  const onCreateCustom = async (label: string): Promise<string> => {
    const row = await createDeliverable.mutateAsync({
      projectId: projectId!,
      name: label,
      kind: 'custom',
      isCustom: true,
    });
    return `${row.id}`;
  };

  React.useImperativeHandle(ref, () => ({
    save: async () => {
      const values = form.getValues('deliverables') ?? [];

      if (values.length === 0) {
        form.setError('deliverables', { message: 'Select at least one deliverable' });
        return false;
      }

      if (!isDirty) {
        return true;
      }

      const rowById = new Map((deliverables ?? []).map((row) => [row.id, row]));

      await onSave({
        deliverables: values.map((v) => {
          const row = rowById.get(v.value);
          return {
            id: v.value,
            name: v.label,
            kind: row?.kind ?? 'custom',
            isCustom: row?.isCustom ?? false,
          };
        }),
      });
      return true;
    },
  }));

  if (isLoading) {
    return (
      <div className="space-y-2 text-left">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="space-y-3 text-left text-sm text-muted-foreground">
        <p>Finish step 1 first — the project has to exist before deliverables can be added.</p>
      </div>
    );
  }

  const options: CardCheckboxOption[] = [
    ...(deliverables ?? []).map((row) => ({
      value: row.id,
      label: row.name,
      icon: DELIVERABLE_KIND_ICONS[row.kind],
      isCustom: row.isCustom,
    })),
  ];

  return (
    <FormProvider {...form}>
      <div className="space-y-6 text-left">
        <CardCheckboxGroup
          projectId={projectId}
          name="deliverables"
          label="What deliverables do you need?"
          options={options}
          otherOption={{
            label: 'Custom deliverable',
            value: 'other',
          }}
          onCreateOption={onCreateCustom}
        />
      </div>
    </FormProvider>
  );
}
