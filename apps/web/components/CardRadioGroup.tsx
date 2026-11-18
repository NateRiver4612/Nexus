'use client';

import { X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Controller, useFormContext, type FieldValues, type FieldPath } from 'react-hook-form';

import { FormLabel } from './ui/form';
import { cn, slugify } from '@/lib/utils';

export type CardRadioTone = 'violet' | 'pink' | 'amber' | 'green' | 'peach' | 'slate' | 'blue';

export type CardRadioOption = {
  value: string;
  label: string;
  isCustom?: boolean;
  icon?: LucideIcon;
  description?: string;
  /** Icon-tile palette, kept here so option data never carries raw colors. */
  tone?: CardRadioTone;
  /** Optional footer line, e.g. "4 Milestones · ~45m/day" on the level cards. */
  meta?: string;
};

type CardRadioGroupProps<TFieldValues extends FieldValues = FieldValues> = {
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
};

const TONE_TILE: Record<CardRadioTone, string> = {
  violet: 'bg-accent-secondary-soft text-accent-secondary-foreground',
  pink: 'bg-accent-secondary-soft text-accent-secondary-foreground',
  amber: 'bg-accent-soft text-accent-foreground',
  green: 'bg-success-soft text-success-foreground',
  peach: 'bg-accent-tertiary-soft text-accent-tertiary-foreground',
  slate: 'bg-muted text-muted-foreground',
  blue: 'bg-primary-soft text-primary-foreground',
};

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
  const groupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Options the user has typed in via "Other", kept alongside the static list.
  const [customOptions, setCustomOptions] = useState<CardRadioOption[]>([]);
  const [isEditingOther, setIsEditingOther] = useState(false);
  const [draft, setDraft] = useState('');

  const otherOption = otherValue ? options.find((o) => o.value === otherValue) : undefined;
  const staticOptions = otherOption ? options.filter((o) => o.value !== otherValue) : options;
  // "Other" always stays last so it reads as the "add your own" affordance.
  const allOptions = otherOption
    ? [...staticOptions, ...customOptions, otherOption]
    : [...staticOptions, ...customOptions];

  useEffect(() => {
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

        const handleKeyDown = (e: KeyboardEvent) => {
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
            tone: 'slate',
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
              className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', gridClassName)}
            >
              {allOptions.map((option) => {
                const isSelected = field.value === option.value;
                const Icon = option.icon;
                const isOtherTrigger = otherOption && option.value === otherOption.value;
                const tone = option.tone ?? 'slate';

                if (isOtherTrigger && isEditingOther) {
                  return (
                    <div
                      key="other-input"
                      className="flex w-full items-center gap-3 rounded-item border border-action bg-surface-secondary px-3 py-3 text-left"
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          TONE_TILE[tone],
                        )}
                      >
                        {Icon && <Icon size={20} />}
                      </span>
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
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-placeholder"
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
                      'group relative flex w-full cursor-pointer rounded-item border text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70 focus-visible:ring-offset-1',
                      disabled && 'cursor-not-allowed opacity-50',
                      isSelected
                        ? 'border-action bg-action'
                        : 'border-border bg-surface hover:border-placeholder',
                      layout === 'column'
                        ? 'min-h-[164px] flex-col items-start gap-3 px-4 py-4'
                        : 'min-h-[64px] items-center gap-3 px-3 py-3',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        isSelected
                          ? 'bg-action-foreground/10 text-action-foreground'
                          : TONE_TILE[tone],
                      )}
                    >
                      {Icon && <Icon size={20} />}
                    </span>

                    <span
                      className={cn(
                        'flex min-w-0 flex-col gap-0.5',
                        layout === 'column' ? 'w-full' : 'flex-1',
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isSelected ? 'text-action-foreground' : 'text-foreground',
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <span
                          className={cn(
                            'text-xs leading-relaxed',
                            isSelected ? 'text-action-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>

                    {layout === 'column' && option.meta && (
                      <span
                        className={cn(
                          'mt-auto text-[11px] font-semibold',
                          isSelected ? 'text-action-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {option.meta}
                      </span>
                    )}

                    {layout === 'column' && isSelected && !option.isCustom && (
                      <span className="absolute right-3 top-3 rounded-pill bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                        Selected
                      </span>
                    )}

                    {option.isCustom && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Remove ${option.label}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveCustomOption(option);
                        }}
                        className={cn(
                          'rounded-full p-1 transition hover:bg-black/10',
                          layout === 'column' ? 'absolute right-3 top-3' : 'ml-auto shrink-0',
                          isSelected ? 'text-action-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <X size={16} />
                      </span>
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
