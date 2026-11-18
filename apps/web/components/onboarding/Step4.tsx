'use client';

import { useEffect, useImperativeHandle, type Ref } from 'react';
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
  ref?: Ref<StepHandle>;
  projectId?: string;
  defaults?: Partial<OnboardingStep4InputType>;
  onSave: (data: OnboardingStep4InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep4InputType>) => void;
};

// The card group keeps { label, value: rowId }; stepData stores { id, name } — mapped on save.
type Step4Form = { deliverables: CardCheckboxValue[] };

/** Display copy for the preset deliverable kinds; custom rows use their own label. */
const DELIVERABLE_DESCRIPTIONS: Record<string, string> = {
  word_report: 'Structured long-form spec or final document',
  spreadsheet: 'Comparison tables, metrics, or tracking grid',
  presentation: 'Slide-by-slide executive narrative & key takeaways',
  timeline: 'Phased milestone schedule with exit gates',
  meeting_notes: 'Auto-generated structured notes per session',
  research_summary: 'Citation-backed synthesis of attached sources',
  financial_model: 'Cost assumptions, forecasts, and scenario math',
};

const Step4Skeleton = () => {
  return (
    <div className="space-y-3 text-left">
      <Skeleton className="h-5 w-56" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="min-h-[50px] rounded-lg border border-border" />
        ))}
      </div>
    </div>
  );
};

export function Step4({ ref, projectId, defaults, onSave, onDraftChange }: Step4Props) {
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

  // Mirror the selection into the draft so the live blueprint preview updates
  // as cards are toggled, without waiting for the step to be saved.
  useEffect(() => {
    if (!onDraftChange) return;

    const subscription = form.watch((values) => {
      const rowById = new Map((deliverables ?? []).map((row) => [row.id, row]));

      const next = (values.deliverables ?? []).flatMap((item) => {
        if (!item?.value || !item.label) return [];

        const row = rowById.get(item.value);

        return [
          {
            id: item.value,
            name: item.label,
            kind: row?.kind ?? 'custom',
            isCustom: row?.isCustom ?? false,
          },
        ];
      });

      onDraftChange({ deliverables: next });
    });

    return () => subscription.unsubscribe();
  }, [form, deliverables, onDraftChange]);

  const onCreateCustom = async (label: string): Promise<string> => {
    const res = await createDeliverable.mutateAsync({
      projectId: projectId!,
      name: label,
      kind: 'custom',
      isCustom: true,
    });
    return `${res.data.id}`;
  };

  useImperativeHandle(ref, () => ({
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
    return <Step4Skeleton />;
  }

  if (!projectId) {
    return (
      <div className="space-y-3 text-left text-sm text-muted-foreground">
        <p>Finish step 1 first — the project has to exist before deliverables can be added.</p>
      </div>
    );
  }

  const options: CardCheckboxOption[] = (deliverables ?? []).map((row) => ({
    value: row.id,
    label: row.name,
    icon: DELIVERABLE_KIND_ICONS[row.kind],
    description: DELIVERABLE_DESCRIPTIONS[row.kind],
    isCustom: row.isCustom,
  }));

  return (
    <FormProvider {...form}>
      <div className="space-y-6 text-left">
        <CardCheckboxGroup
          projectId={projectId}
          name="deliverables"
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
