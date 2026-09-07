'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingStep4Schema } from '@nexus/zod-schemas';
import type { OnboardingStep4InputType } from '@nexus/types';
import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { StepHandle } from './shared';
import { useDraftSync } from './useDraftSync';

type Step4Props = {
  ref?: React.Ref<StepHandle>;
  defaults?: Partial<OnboardingStep4InputType>;
  onSave: (data: OnboardingStep4InputType) => Promise<unknown>;
  onDraftChange?: (data: Partial<OnboardingStep4InputType>) => void;
};

export function Step4({ ref, defaults, onSave, onDraftChange }: Step4Props) {
  const savedDeliverables = defaults?.deliverables;
  const form = useForm<OnboardingStep4InputType>({
    defaultValues: {
      deliverables:
        savedDeliverables && savedDeliverables.length > 0 ? savedDeliverables : [''],
    },
    resolver: zodResolver(onboardingStep4Schema),
  });

  const [newDeliverable, setNewDeliverable] = React.useState('');
  const deliverables = form.watch('deliverables') ?? [];
  const deliverablesError = form.formState.errors.deliverables?.message;

  React.useImperativeHandle(ref, () => ({
    save: async () => {
      const valid = await form.trigger();
      const trimmedDeliverables = form
        .getValues('deliverables')
        .map((deliverable) => deliverable.trim())
        .filter(Boolean);
      const deliverablesValid = trimmedDeliverables.length > 0;
      if (!valid || !deliverablesValid) {
        if (!deliverablesValid) {
          form.setError('deliverables', { message: 'Add at least one deliverable' });
        }
        return false;
      }
      await onSave({ deliverables: trimmedDeliverables });
      return true;
    },
  }));

  useDraftSync(form, onDraftChange);

  function addDeliverable() {
    const trimmed = newDeliverable.trim();
    if (!trimmed) return;
    form.setValue(
      'deliverables',
      [...deliverables.filter((deliverable) => deliverable.trim() !== ''), trimmed],
      { shouldValidate: true },
    );
    setNewDeliverable('');
  }

  function removeDeliverable(index: number) {
    const next = [...deliverables];
    next.splice(index, 1);
    form.setValue('deliverables', next, { shouldValidate: true });
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-6 text-left">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Deliverables</span>
          <div className="flex flex-col gap-2">
            {deliverables.map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  {...form.register(`deliverables.${index}`)}
                  placeholder="e.g. Market Research Report"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDeliverable(index)}
                  disabled={deliverables.length <= 1}
                >
                  <Minus className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDeliverable();
                }
              }}
              placeholder="Add a deliverable…"
            />
            <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {deliverablesError && (
            <p className="text-xs font-medium text-destructive">{deliverablesError}</p>
          )}
        </div>
      </div>
    </FormProvider>
  );
}