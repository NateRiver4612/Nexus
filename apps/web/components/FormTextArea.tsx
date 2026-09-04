'use client';

import * as React from 'react';
import { Controller, useFormContext, type FieldValues, type FieldPath } from 'react-hook-form';
import { Textarea } from './ui/textarea';
import { FormLabel } from './ui/form';
import { cn } from '@/lib/utils';

interface FormTextAreaProps<TFieldValues extends FieldValues = FieldValues> {
  /** Field name — must match a key registered in the parent FormProvider's schema */
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * A self-contained textarea. Reads/writes its value through `useFormContext`,
 * so it must be rendered inside a react-hook-form `<FormProvider {...methods}>`.
 * No value/onChange props needed — it controls itself.
 */
export const FormTextArea = ({
  name,
  label,
  description,
  placeholder,
  rows = 4,
  maxLength,
  className,
  disabled,
}: FormTextAreaProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = errors[name as string];
  const textareaId = React.useId();
  const descriptionId = description ? `${textareaId}-description` : undefined;
  const errorId = fieldError ? `${textareaId}-error` : undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const length = typeof field.value === 'string' ? field.value.length : 0;

        return (
          <div className={cn('flex flex-col gap-3', className)}>
            {label && <FormLabel>{label}</FormLabel>}

            <Textarea
              {...field}
              id={textareaId}
              rows={rows}
              maxLength={maxLength}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={!!fieldError}
              aria-describedby={cn(descriptionId, errorId) || undefined}
              value={field.value ?? ''}
              className={cn(
                disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
                fieldError && 'border-red-500',
              )}
            />

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {fieldError ? (
                  <p id={errorId} className="text-xs text-red-600">
                    {fieldError.message as string}
                  </p>
                ) : (
                  description && (
                    <p id={descriptionId} className="text-xs text-gray-500">
                      {description}
                    </p>
                  )
                )}
              </div>

              {maxLength && (
                <span
                  className={cn(
                    'shrink-0 text-xs tabular-nums',
                    length >= maxLength ? 'text-red-600' : 'text-gray-400',
                  )}
                >
                  {length}/{maxLength}
                </span>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};
