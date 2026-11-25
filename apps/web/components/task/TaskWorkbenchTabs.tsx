'use client';

import { createContext, useContext } from 'react';
import { FileText, Sparkles, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TaskWorkbenchMode = 'note' | 'assistant';

type TaskWorkbenchModeContextValue = {
  mode: TaskWorkbenchMode;
  onSelect: (mode: TaskWorkbenchMode) => void;
};

export const TaskWorkbenchModeContext = createContext<TaskWorkbenchModeContextValue | null>(null);

const TABS: { value: TaskWorkbenchMode; label: string; icon: LucideIcon }[] = [
  { value: 'note', label: 'Note Editor', icon: FileText },
  { value: 'assistant', label: 'AI Assistant', icon: Sparkles },
];

/**
 * The Note/AI switcher. Reading `mode` from context (instead of a prop) keeps the switcher's
 * element stable, so the memoized panes don't re-render when the tab changes.
 */
export const TaskWorkbenchTabs = () => {
  const context = useContext(TaskWorkbenchModeContext);
  if (!context) return null;

  const { mode, onSelect } = context;

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-pill border border-border bg-surface-secondary p-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = mode === tab.value;
        const iconColor = tab.value === 'note' ? 'text-accent' : 'text-accent-secondary';

        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold transition-colors',
              active
                ? 'bg-action text-action-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('size-3.5', iconColor)} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
