'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type TaskChecklistSectionProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  completedCount: number;
  totalCount: number;
  iconClassName?: string;
  children: ReactNode;
  /** Optional trailing control in the header, e.g. a collapse toggle. */
  action?: ReactNode;
  className?: string;
};

/** Shared card shell for the Requirements and Definition-of-done lists. */
const TaskChecklistSection = ({
  icon: Icon,
  title,
  subtitle,
  completedCount,
  totalCount,
  iconClassName,
  children,
  action,
  className,
}: TaskChecklistSectionProps) => {
  return (
    <Card className={cn('flex flex-col gap-4 p-5', className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-pill',
            iconClassName,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
              {title}
            </h2>
            <span className="rounded-pill border border-border bg-surface-secondary px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>

      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
};

export default TaskChecklistSection;
