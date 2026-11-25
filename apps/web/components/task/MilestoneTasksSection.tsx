'use client';

import type { TaskDetailType } from '@nexus/types';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMilestones } from '@/hooks/useMilestones';

import MilestoneTaskItem from './MilestoneTaskItem';

type MilestoneTasksSectionProps = {
  task: TaskDetailType;
};

/** Sibling tasks of the current task's milestone, in plan order. */
const MilestoneTasksSection = ({ task }: MilestoneTasksSectionProps) => {
  const { data: milestones = [], isLoading } = useGetMilestones({
    variables: task.project.id,
  });

  const orderedMilestones = [...milestones].sort((a, b) => a.position - b.position);
  const milestoneIndex = orderedMilestones.findIndex(
    (milestone) => milestone.id === task.milestone?.id,
  );
  const milestone = milestoneIndex >= 0 ? orderedMilestones[milestoneIndex] : undefined;
  const milestoneTasks = milestone
    ? [...milestone.tasks].sort((a, b) => a.position - b.position)
    : [];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {milestone ? `Milestone ${milestoneIndex + 1} Tasks` : 'Milestone Tasks'}
        </h2>
        {milestone && (
          <span className="max-w-40 truncate rounded-pill bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
            {milestone.title}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-item" />
          ))}
        </div>
      ) : milestoneTasks.length > 0 ? (
        <div className="space-y-2">
          {milestoneTasks.map((item, index) => (
            <MilestoneTaskItem
              key={item.id}
              task={item}
              index={index}
              isCurrent={item.id === task.id}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-item border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No other tasks in this milestone.
        </p>
      )}
    </Card>
  );
};

export default MilestoneTasksSection;
