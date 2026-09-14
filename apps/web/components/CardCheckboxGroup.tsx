'use client';

import * as React from 'react';
import { Controller, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { Plus, X, type LucideIcon } from 'lucide-react';

import { Checkbox } from './ui/checkbox';
import { FormLabel } from './ui/form';
import { cn, slugify } from '@/lib/utils';
import { useDeleteDeliverable } from '@/hooks/useDeliverables';

export interface CardCheckboxOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  isCustom?: boolean;
}

/** The field value kept in the form — value matches an option's value, label for display. */
export type CardCheckboxValue = {
  label: string;
  value: string;
};

interface CardCheckboxGroupProps<TFieldValues extends FieldValues = FieldValues> {
  /** Field name — must match a key registered in the parent FormProvider's schema */
  name: FieldPath<TFieldValues>;
  options: CardCheckboxOption[];
  projectId: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Option value that reveals an inline "add your own" input (like Category in step 1). */
  otherOption?: {
    label: string;
    value: string;
  };
  /** Called on commit of the inline input; may return a value or a full option (async ok). */
  onCreateOption?: (
    label: string,
  ) => string | CardCheckboxOption | Promise<string | CardCheckboxOption>;

  /** Fired after each change with the full next value — lets the parent sync to the server. */
  onValueChange?: (values: CardCheckboxValue[]) => void;
}

/**
 * Multi-select card grid bound to a `string[]` field, built on the shared
 * `Checkbox` primitive. Supports an inline "other" input (CardRadioGroup-style)
 * whose created option can come from an async `onCreateOption` (e.g. a row id).
 */
export const CardCheckboxGroup = <TFieldValues extends FieldValues = FieldValues>({
  projectId,
  name,
  options,
  label,
  disabled,
  className,
  otherOption,
  onCreateOption,
  onValueChange,
}: CardCheckboxGroupProps<TFieldValues>) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const fieldError = errors[name as string];
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isEditingOther, setIsEditingOther] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const [customOption, setCustomOption] = React.useState<CardCheckboxOption>();

  const [deleteItem, setDeleteItem] = React.useState<string>();

  const { mutateAsync: deleteDeliverable } = useDeleteDeliverable({
    onSuccess: () => {
      setDeleteItem(undefined);
    },
    onError: () => {
      setDeleteItem(undefined);
    },
  });

  React.useEffect(() => {
    if (isEditingOther) inputRef.current?.focus();
  }, [isEditingOther]);

  const handleDeleteCustomDeliverable = async (id: string) => {
    setDeleteItem(id);

    setTimeout(async () => {
      await deleteDeliverable({
        projectId,
        deliverableId: id,
      });
    }, 1000);
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const values: CardCheckboxValue[] = (field.value ?? []) as CardCheckboxValue[];

        const isSelected = (optionValue: string) => values.some((v) => v.value === optionValue);

        const toggle = (option: CardCheckboxOption) => {
          const exists = isSelected(option.value);
          const next = exists
            ? values.filter((v) => v.value !== option.value)
            : [...values, { label: option.label, value: option.value }];
          field.onChange(next);
          onValueChange?.(next);
        };

        const commitDraft = async () => {
          const label = draft.trim();
          setIsEditingOther(false);
          setDraft('');
          if (!label) return;

          setCustomOption({
            value: 'proccessing',
            label,
          });

          setTimeout(async () => {
            const created = onCreateOption
              ? await onCreateOption(label)
              : ({
                  value: slugify(label),
                  label,
                } as CardCheckboxOption);

            const option: CardCheckboxOption =
              typeof created === 'string'
                ? { value: created, label }
                : { ...created, label: created.label || label };

            setCustomOption(undefined);

            const next = isSelected(option.value)
              ? values
              : [...values, { label: option.label, value: option.value }];
            field.onChange(next);
            onValueChange?.(next);
          }, 1500);
        };

        return (
          <div className={cn('flex flex-col gap-3', className)}>
            {label && <FormLabel>{label}</FormLabel>}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[...options, ...[customOption]]
                .filter((o) => !!o)
                .map((option) => {
                  const isSelected = values.some((v) => v.value === option.value);
                  const isDeleting = option.value === deleteItem;
                  const Icon = option.icon;
                  const isAddingOption = option.value === 'proccessing';

                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex min-h-[50px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                        (disabled || isDeleting || isAddingOption) &&
                          'cursor-not-allowed opacity-50',
                        isAddingOption && 'animate-bounce',
                        isDeleting && 'animate-pulse',
                        isSelected
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        value={option.value}
                        disabled={disabled || isDeleting}
                        onCheckedChange={() => toggle(option)}
                        aria-label={option.label}
                      />
                      <span className="flex min-w-0 flex-1 flex-col text-left">
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            isSelected ? 'text-primary' : 'text-gray-900',
                          )}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs text-gray-500">{option.description}</span>
                        )}
                      </span>
                      {Icon && (
                        <Icon
                          size={20}
                          className={cn('shrink-0', isSelected ? 'text-primary' : 'text-gray-300')}
                        />
                      )}
                      {option.isCustom && (
                        <span
                          role="button"
                          tabIndex={-1}
                          className="shrink-0 cursor-pointer rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                        >
                          <X
                            size={18}
                            onClick={async (e) => {
                              e.preventDefault();
                              // const next = values.filter((v) => v !== option.value);

                              await handleDeleteCustomDeliverable(option.value);

                              // field.onChange(next);
                              // onValueChange?.(next);
                            }}
                          />
                        </span>
                      )}
                    </label>
                  );
                })}
              {otherOption &&
                (isEditingOther ? (
                  <div
                    key="other-input"
                    className="row-span-1 flex w-full items-center gap-3 rounded-lg border border-primary bg-blue-50 px-4 py-3 text-left"
                  >
                    <input
                      ref={inputRef}
                      value={draft}
                      disabled={disabled}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitDraft();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsEditingOther(false);
                          setDraft('');
                        }
                      }}
                      onBlur={() => void commitDraft()}
                      placeholder="Custom deliverable…"
                      className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                ) : (
                  <button
                    key={otherOption.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsEditingOther(true)}
                    className={cn(
                      'flex min-h-[50px] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-left transition-colors',
                      'hover:border-gray-400',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Plus className="size-5 shrink-0 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">{otherOption.label}</span>
                  </button>
                ))}
            </div>

            {fieldError && <p className="text-xs text-red-600">{fieldError.message as string}</p>}
          </div>
        );
      }}
    />
  );
};
