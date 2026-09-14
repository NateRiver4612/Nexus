'use client';

import { useFormContext, type FieldValues, type FieldPath } from 'react-hook-form';
import { Textarea } from './ui/textarea';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { cn } from '@/lib/utils';

type FormTextAreaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
  label?: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
};

export function FormTextArea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  description,
  placeholder,
  rows = 4,
  maxLength,
  className,
  disabled,
}: FormTextAreaProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const length = typeof field.value === 'string' ? field.value.length : 0;

        return (
          <FormItem className={cn('flex flex-col gap-3', className)}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Textarea
                {...field}
                rows={rows}
                maxLength={maxLength}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(disabled && 'cursor-not-allowed opacity-50 bg-gray-50')}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <div className="flex items-start justify-between gap-2">
              <FormMessage />
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
          </FormItem>
        );
      }}
    />
  );
}
