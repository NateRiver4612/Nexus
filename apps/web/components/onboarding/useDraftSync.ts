'use client';

import * as React from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Debounced bridge from a step's react-hook-form to the draft store. Subscribes
 * to every form change and reports the full values ~`delay`ms after the user
 * stops typing. Skips subscribing entirely when `onDraftChange` is undefined.
 */
export function useDraftSync<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  onDraftChange?: (data: Partial<TFieldValues>) => void,
  delay = 300,
) {
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    if (!onDraftChange) return;
    const subscription = form.watch(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onDraftChange(form.getValues()), delay);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form, onDraftChange, delay]);
}