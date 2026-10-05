'use client';

import { Circle, CircleCheck } from 'lucide-react';

import { cn, formatTimeMinutes } from '@/lib/utils';

import type { KickoffPlanType } from '@nexus/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import DifficultyIndicator from './DifficultyIndicator';

type Milestone = KickoffPlanType['milestones'][number];
type Task = Milestone['tasks'][number];

interface KickoffPlanListProps {
  milestones: KickoffPlanType['milestones'];
  className?: string;
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === 'completed';
  const StatusIcon = isCompleted ? CircleCheck : Circle;
  const estimated = formatTimeMinutes(task.estimatedTimeMinutes);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <StatusIcon
          size={18}
          className={cn('mt-0.5 shrink-0', isCompleted ? 'text-primary' : 'text-gray-300')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm font-medium',
                isCompleted ? 'text-gray-400 line-through' : 'text-gray-900',
              )}
            >
              {task.title}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <DifficultyIndicator difficulty={task.difficulty} />
              {estimated && <span className="text-xs tabular-nums text-gray-400">{estimated}</span>}
            </div>
          </div>

          {task.steps.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {task.steps.map((step, index) => (
                <li key={index} className="flex gap-2 text-xs text-gray-500">
                  <span className="select-none text-gray-300">–</span>
                  <span className="min-w-0 flex-1">{step.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneHeader({ index, milestone }: { index: number; milestone: Milestone }) {
  return (
    <div className="flex w-full items-start justify-between gap-3 pr-2">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-medium text-gray-600">
          {index + 1}
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {milestone.title}
          </span>
          {milestone.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{milestone.description}</p>
          )}
        </div>
      </div>
      <span className="shrink-0 pt-0.5 text-xs text-gray-400">{milestone.tasks.length} tasks</span>
    </div>
  );
}

export function KickoffPlanList({ milestones, className }: KickoffPlanListProps) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['milestone-0']}
      className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
    >
      {milestones.map((milestone, index) => (
        <AccordionItem
          key={`${milestone.title}-${index}`}
          value={`milestone-${index}`}
          className={cn(index === milestones.length - 1 && 'border-b-0')}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <MilestoneHeader index={index} milestone={milestone} />
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3">
            <div className="flex flex-col gap-2">
              {milestone.tasks.map((task, taskIndex) => (
                <TaskRow key={`${task.title}-${taskIndex}`} task={task} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
