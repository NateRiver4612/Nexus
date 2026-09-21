'use client';

import { Circle, CircleCheck } from 'lucide-react';

import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

import type { KickoffPlanType } from '@nexus/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type Milestone = KickoffPlanType['milestones'][number];
type Task = Milestone['tasks'][number];

interface KickoffPlanListProps {
  plan: KickoffPlanType;
  className?: string;
}

const PRIORITY_BADGE_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 hover:bg-red-100',
  high: 'bg-red-50 text-red-600 hover:bg-red-50',
};

/**
 * High/urgent priority render as a colored pill; medium/low render as plain
 * muted text — mirrors the reference design where only the priorities that
 * need attention get visual weight.
 */
function PriorityIndicator({ priority }: { priority?: string | null }) {
  if (!priority) return null;

  const badgeStyle = PRIORITY_BADGE_STYLES[priority];
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);

  if (badgeStyle) {
    return (
      <Badge variant="secondary" className={cn('shrink-0 font-medium', badgeStyle)}>
        {label}
      </Badge>
    );
  }

  return <span className="shrink-0 text-sm text-gray-400">{label}</span>;
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === 'completed';
  const StatusIcon = isCompleted ? CircleCheck : Circle;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <StatusIcon
        size={18}
        className={cn('shrink-0', isCompleted ? 'text-primary' : 'text-gray-300')}
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900',
        )}
      >
        {task.title}
      </span>
      <PriorityIndicator priority={task.priority} />
    </div>
  );
}

function MilestoneHeader({ index, milestone }: { index: number; milestone: Milestone }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 pr-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-medium text-gray-600">
          {index + 1}
        </span>
        <span className="truncate text-sm font-semibold text-gray-900">{milestone.title}</span>
      </div>
      <span className="shrink-0 text-xs text-gray-400">{milestone.tasks.length} tasks</span>
    </div>
  );
}

export function KickoffPlanList({ plan, className }: KickoffPlanListProps) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['milestone-0']}
      className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
    >
      {plan.milestones.map((milestone, index) => (
        <AccordionItem
          key={`${milestone.title}-${index}`}
          value={`milestone-${index}`}
          className={cn(index === plan.milestones.length - 1 && 'border-b-0')}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <MilestoneHeader index={index} milestone={milestone} />
          </AccordionTrigger>
          <AccordionContent className="divide-y divide-gray-100 pb-1">
            {milestone.tasks.map((task, taskIndex) => (
              <TaskRow key={`${task.title}-${taskIndex}`} task={task} />
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
