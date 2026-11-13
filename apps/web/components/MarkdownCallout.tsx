import type { LucideIcon } from 'lucide-react';
import { BadgeAlert, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

/** Matches the GitHub alert classes emitted by `remark-github-blockquote-alert`. */
const CALLOUT_CONFIG: Record<
  CalloutType,
  { label: string; icon: LucideIcon; container: string; title: string; iconColor: string }
> = {
  note: {
    label: 'Note',
    icon: Info,
    container: 'border-blue-200 bg-blue-50',
    title: 'text-blue-900',
    iconColor: 'text-blue-600',
  },
  tip: {
    label: 'Tip',
    icon: Lightbulb,
    container: 'border-green-200 bg-green-50',
    title: 'text-green-900',
    iconColor: 'text-green-600',
  },
  important: {
    label: 'Important',
    icon: BadgeAlert,
    container: 'border-violet-200 bg-violet-50',
    title: 'text-violet-900',
    iconColor: 'text-violet-600',
  },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
    container: 'border-amber-200 bg-amber-50',
    title: 'text-amber-900',
    iconColor: 'text-amber-600',
  },
  caution: {
    label: 'Caution',
    icon: OctagonAlert,
    container: 'border-red-200 bg-red-50',
    title: 'text-red-900',
    iconColor: 'text-red-600',
  },
};

export const MarkdownCallout = ({ type, children }: { type: CalloutType; children: ReactNode }) => {
  const { container } = CALLOUT_CONFIG[type];
  return <div className={cn('my-3 rounded-lg border px-4 py-3', container)}>{children}</div>;
};

export const MarkdownCalloutTitle = ({ type }: { type: CalloutType }) => {
  const { label, icon: Icon, title, iconColor } = CALLOUT_CONFIG[type];
  return (
    <p className={cn('mb-1 flex items-center gap-1.5 text-sm font-semibold', title)}>
      <Icon className={cn('size-4 shrink-0', iconColor)} />
      {label}
    </p>
  );
};
