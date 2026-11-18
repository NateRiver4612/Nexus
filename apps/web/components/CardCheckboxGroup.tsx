'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { Plus, X, type LucideIcon } from 'lucide-react';

import { Checkbox } from './ui/checkbox';
import { FormLabel } from './ui/form';
import { cn, slugify } from '@/lib/utils';
import { useDeleteDeliverable } from '@/hooks/useDeliverables';

export type CardCheckboxOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  isCustom?: boolean;
};

/** The field value kept in the form — value matches an option's value, label for display. */
export type CardCheckboxValue = {
  label: string;
  value: string;
};

type CardCheckboxGroupProps<TFieldValues extends FieldValues = FieldValues> = {
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
};

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditingOther, setIsEditingOther] = useState(false);
  const [draft, setDraft] = useState('');

  const [customOption, setCustomOption] = useState<CardCheckboxOption>();

  const [deleteItem, setDeleteItem] = useState<string>();

  const { mutateAsync: deleteDeliverable } = useDeleteDeliverable({
    onSuccess: () => {
      setDeleteItem(undefined);
    },
    onError: () => {
      setDeleteItem(undefined);
    },
  });

  useEffect(() => {
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
        const allOptions = customOption ? [...options, customOption] : options;

        const isOptionSelected = (optionValue: string) =>
          values.some((v) => v.value === optionValue);

        const toggle = (option: CardCheckboxOption) => {
          const exists = isOptionSelected(option.value);
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

            const next = isOptionSelected(option.value)
              ? values
              : [...values, { label: option.label, value: option.value }];
            field.onChange(next);
            onValueChange?.(next);
          }, 1500);
        };

        return (
          <div className={cn('flex flex-col gap-3', className)}>
            {label && <FormLabel>{label}</FormLabel>}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allOptions.map((option) => {
                const isSelected = values.some((v) => v.value === option.value);
                const isDeleting = option.value === deleteItem;
                const Icon = option.icon;
                const isAddingOption = option.value === 'proccessing';

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'group flex min-h-[76px] cursor-pointer items-center gap-3 rounded-item border px-4 py-3 text-left transition-colors',
                      (disabled || isDeleting || isAddingOption) && 'cursor-not-allowed opacity-50',
                      isAddingOption && 'animate-bounce',
                      isDeleting && 'animate-pulse',
                      isSelected
                        ? 'border-action bg-primary-subtle'
                        : 'border-border bg-surface hover:border-placeholder',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      value={option.value}
                      disabled={disabled || isDeleting}
                      onCheckedChange={() => toggle(option)}
                      aria-label={option.label}
                      className="size-5 rounded-md data-[state=checked]:border-action data-[state=checked]:bg-action data-[state=checked]:text-action-foreground"
                    />

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </span>

                    {Icon && (
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg',
                          isSelected
                            ? 'bg-action text-action-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon size={18} />
                      </span>
                    )}

                    {option.isCustom && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Remove ${option.label}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleDeleteCustomDeliverable(option.value);
                        }}
                        className="shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <X size={16} />
                      </span>
                    )}
                  </label>
                );
              })}

              {otherOption &&
                (isEditingOther ? (
                  <div
                    key="other-input"
                    className="flex min-h-[76px] w-full items-center gap-3 rounded-item border border-action bg-surface-secondary px-4 py-3 text-left"
                  >
                    <Plus className="size-5 shrink-0 text-muted-foreground" />
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
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-placeholder"
                    />
                  </div>
                ) : (
                  <button
                    key={otherOption.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsEditingOther(true)}
                    className={cn(
                      'flex min-h-[76px] cursor-pointer items-center justify-center gap-2 rounded-item border border-dashed border-border px-4 py-3 text-center transition-colors',
                      'hover:border-placeholder hover:bg-surface-secondary',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Plus className="size-5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      {otherOption.label}
                    </span>
                  </button>
                ))}
            </div>

            {fieldError && (
              <p className="text-destructive text-sm">{fieldError.message as string}</p>
            )}
          </div>
        );
      }}
    />
  );
};
