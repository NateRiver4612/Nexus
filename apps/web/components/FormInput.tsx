import * as React from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Input>, 'name' | 'defaultValue'> {
  name: TName;
  label?: string;
  description?: string;
  trailingIcon?: LucideIcon;
  onTrailingIconClick?: () => void;
  trailingIconLabel?: string;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  description,
  className,
  trailingIcon: TrailingIcon,
  trailingIconLabel,
  onTrailingIconClick,
  ...inputProps
}: FormInputProps<TFieldValues, TName>) {
  // Requires being rendered inside a <Form {...form}> (FormProvider) ancestor —
  // if it isn't, this throws trying to destructure `control` from a null context,
  // which is the correct failure mode (loud, not silent) for a missing provider.
  const {
    control,
    formState: { isValid },
  } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="relative flex items-center">
              <Input
                {...field}
                {...inputProps}
                aria-invalid={fieldState.invalid}
                className={cn(TrailingIcon && 'pr-10', className)}
              />
              {TrailingIcon && onTrailingIconClick && (
                <button
                  type="button"
                  onClick={onTrailingIconClick}
                  aria-label={trailingIconLabel}
                  className={cn(
                    'absolute opacity-0 inset-y-0 mt-1.75 h-fit hover:bg-blue-500 right-3 cursor-pointer flex p-1 rounded-full items-center text-gray-400 transition hover:text-white',
                    {
                      'opacity-100': isValid,
                    },
                  )}
                >
                  <TrailingIcon size={20} />
                </button>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
