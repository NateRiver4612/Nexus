'use client';

import { X, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext, type FieldValues, type FieldPath } from 'react-hook-form';
import { FormLabel } from './ui/form';
import { slugify } from '@/lib/utils';

// Minimal className combiner — swap for your existing `cn` from lib/utils if you have one.
function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export interface CardRadioOption {
  value: string;
  label: string;
  isCustom?: boolean;
  icon?: LucideIcon;
  description?: string;
}

interface CardRadioGroupProps<TFieldValues extends FieldValues = FieldValues> {
  /** Field name — must match a key registered in the parent FormProvider's schema */
  name: FieldPath<TFieldValues>;
  options: CardRadioOption[];
  className?: string;
  disabled?: boolean;
  otherValue?: string;
  customOptionIcon?: LucideIcon;
  label?: string;
  onCreateOption?: (option: CardRadioOption) => void;
  layout?: 'row' | 'column';
  gridClassName?: string;
}

/**
 * A self-contained radio-group of cards. Reads/writes its value through
 * `useFormContext`, so it must be rendered inside a react-hook-form
 * `<FormProvider {...methods}>`. No value/onChange props needed —
 * it controls itself.
 */
export const CardRadioGroup = ({
  name,
  options,
  className,
  label,
  disabled,
  otherValue = 'other',
  customOptionIcon,
  onCreateOption,
  layout = 'row',
  gridClassName,
}: CardRadioGroupProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = errors[name as string];
  const groupRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Options the user has typed in via "Other", kept alongside the static list.
  const [customOptions, setCustomOptions] = React.useState<CardRadioOption[]>([]);
  const [isEditingOther, setIsEditingOther] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const otherOption = otherValue ? options.find((o) => o.value === otherValue) : undefined;
  const staticOptions = otherOption ? options.filter((o) => o.value !== otherValue) : options;
  // "Other" always stays last so it reads as the "add your own" affordance.
  const allOptions = otherOption
    ? [...staticOptions, ...customOptions, otherOption]
    : [...staticOptions, ...customOptions];

  React.useEffect(() => {
    if (isEditingOther) inputRef.current?.focus();
  }, [isEditingOther]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedIndex = allOptions.findIndex((o) => o.value === field.value);

        const focusItem = (index: number) => {
          const items = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
          items?.[index]?.focus();
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
          e.preventDefault();
          const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
          const current = selectedIndex === -1 ? 0 : selectedIndex;
          const next = (current + dir + allOptions.length) % allOptions.length;
          field.onChange(allOptions[next]?.value);
          focusItem(next);
        };

        const commitDraft = () => {
          const label = draft.trim();
          setIsEditingOther(false);
          setDraft('');
          if (!label) return; // empty submit just cancels back to the "Other" card

          const value = slugify(label);
          const newOption: CardRadioOption = {
            value,
            label,
            isCustom: true,
            icon: customOptionIcon ?? otherOption?.icon ?? staticOptions[0]?.icon,
          };

          setCustomOptions((prev) => [...prev, newOption]);
          onCreateOption?.(newOption);
          field.onChange(value);
        };

        const handleRemoveCustomOption = (option: CardRadioOption) => {
          setCustomOptions((prev) => prev.filter((o) => o.value !== option.value));
          if (field.value === option.value) {
            field.onChange(''); // clear selection if the removed option was selected
          }
        };

        return (
          <div className={cn('flex flex-col gap-3', className)}>
            {label && <FormLabel>{label}</FormLabel>}
            <div
              ref={groupRef}
              role="radiogroup"
              aria-invalid={!!fieldError}
              onKeyDown={handleKeyDown}
              className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', gridClassName)}
            >
              {allOptions.map((option) => {
                const isSelected = field.value === option.value;
                const Icon = option.icon;
                const isOtherTrigger = otherOption && option.value === otherOption.value;

                if (isOtherTrigger && isEditingOther) {
                  return (
                    <div
                      key="other-input"
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left',
                        'border-blue-600 bg-blue-50',
                      )}
                    >
                      {Icon && <Icon className="h-5 w-5 shrink-0 text-blue-600" />}
                      <input
                        ref={inputRef}
                        value={draft}
                        disabled={disabled}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation(); // don't let arrow keys move the radiogroup focus while typing
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitDraft();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setIsEditingOther(false);
                            setDraft('');
                          }
                        }}
                        onBlur={commitDraft}
                        placeholder="Type a category…"
                        className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={disabled}
                    tabIndex={isSelected || selectedIndex === -1 ? 0 : -1}
                    onClick={() => {
                      if (isOtherTrigger) {
                        setIsEditingOther(true);
                        return;
                      }
                      field.onChange(option.value);
                    }}
                    onBlur={field.onBlur}
                    className={cn(
                      'group relative flex w-full cursor-pointer items-center rounded-lg border transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                      disabled && 'cursor-not-allowed opacity-50',
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                      layout === 'column'
                        ? 'min-h-[140px] flex-col rounded-xl justify-center gap-2 px-4 py-6 text-center'
                        : 'min-h-[50px] gap-3 px-4 py-3 text-left',
                    )}
                  >
                    {layout === 'column' ? (
                      <div className="flex flex-col items-center gap-2">
                        {Icon && (
                          <Icon
                            size={24}
                            className={cn(isSelected ? 'text-blue-600' : 'text-gray-500')}
                          />
                        )}
                        <span className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-blue-600' : 'text-gray-900',
                            )}
                          >
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="text-xs text-gray-500">{option.description}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center gap-3">
                        {Icon && (
                          <Icon
                            size={20}
                            className={cn(
                              'shrink-0',
                              isSelected ? 'text-blue-600' : 'text-gray-500',
                            )}
                          />
                        )}
                        <span className="flex flex-col">
                          <span
                            className={cn(
                              'text-sm',
                              isSelected ? 'text-blue-600' : 'text-gray-900',
                            )}
                          >
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="text-xs text-gray-500">{option.description}</span>
                          )}
                        </span>
                      </div>
                    )}

                    {option.isCustom && (
                      <div
                        onClick={() => handleRemoveCustomOption(option)}
                        className={cn(
                          'rounded-full p-1 opacity-0 transition hover:bg-gray-200 group-hover:opacity-100',
                          layout === 'column' ? 'absolute right-2 top-2' : 'text-end',
                        )}
                      >
                        <X size={18} />
                      </div>
                    )}
                  </button>
                );
              })}
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
