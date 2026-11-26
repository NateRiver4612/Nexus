'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

type TaskChecklistItemProps = {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

/** One requirement / definition-of-done row — the whole row toggles the check. */
const TaskChecklistItem = ({ label, checked, onToggle }: TaskChecklistItemProps) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="flex w-full items-start gap-3 rounded-item border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          checked
            ? 'border-action bg-action text-action-foreground'
            : 'border-border bg-surface text-transparent',
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span
        className={cn(
          'text-sm leading-relaxed text-foreground',
          checked && 'text-muted-foreground line-through',
        )}
      >
        {label}
      </span>
    </button>
  );
};

export default TaskChecklistItem;
