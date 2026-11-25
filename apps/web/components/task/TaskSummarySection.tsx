import type { TaskDetailType } from '@nexus/types';
import { BadgeCheck, ListChecks, PanelRightClose, PanelRightOpen } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateTaskDodStatus, useUpdateTaskStepStatus } from '@/hooks/useTasks';

import TaskChecklistItem from './TaskChecklistItem';
import TaskChecklistSection from './TaskChecklistSection';

type TaskSummarySectionProps = {
  task?: TaskDetailType;
  isLoading?: boolean;
  /** Narrow checklist rail vs. the full Requirements/DoD cards. */
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export const TaskSummarySectionSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((index) => (
        <Card key={index} className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-pill" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-12 w-full rounded-item" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

const EmptyChecklist = ({ label }: { label: string }) => {
  return (
    <p className="rounded-item border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {label}
    </p>
  );
};

type ChecklistRailProps = {
  requirementsCompleted: number;
  requirementsTotal: number;
  dodsCompleted: number;
  dodsTotal: number;
  onExpand?: () => void;
};

/** Collapsed right column: expand control plus the two colored checklist counts. */
const ChecklistRail = ({
  requirementsCompleted,
  requirementsTotal,
  dodsCompleted,
  dodsTotal,
  onExpand,
}: ChecklistRailProps) => {
  return (
    <div className="mx-auto flex h-full w-14 flex-col items-center gap-3 rounded-full border border-border bg-card px-1 py-3 shadow-2xs lg:mx-0 lg:w-full">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand checklist"
        title="Expand checklist"
        className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:brightness-95"
      >
        <PanelRightOpen className="size-4" aria-hidden="true" />
      </button>

      <div className="h-px w-8 bg-border" />

      <div className="mt-auto flex flex-col items-center gap-2">
        <span
          title={`Requirements ${requirementsCompleted}/${requirementsTotal}`}
          className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold tabular-nums text-primary-foreground"
        >
          {requirementsCompleted}/{requirementsTotal}
        </span>
        <span
          title={`Definition of done ${dodsCompleted}/${dodsTotal}`}
          className="flex size-10 items-center justify-center rounded-full bg-accent-secondary-soft text-[10px] font-bold tabular-nums text-accent-secondary-foreground"
        >
          {dodsCompleted}/{dodsTotal}
        </span>
      </div>
    </div>
  );
};

/** Right column: requirements and definition-of-done checklists. */
const TaskSummarySection = ({
  task,
  isLoading,
  isCollapsed = false,
  onToggleCollapse,
}: TaskSummarySectionProps) => {
  const { mutate: updateDodStatus } = useUpdateTaskDodStatus();
  const { mutate: updateStepStatus } = useUpdateTaskStepStatus();

  if (isLoading || !task) {
    return <TaskSummarySectionSkeleton />;
  }

  const taskId = task.id;
  const completedSteps = task.steps.filter((step) => step.status === 'completed').length;
  const completedDods = task.dods.filter((dod) => dod.status === 'completed').length;

  if (isCollapsed) {
    return (
      <ChecklistRail
        requirementsCompleted={completedSteps}
        requirementsTotal={task.steps.length}
        dodsCompleted={completedDods}
        dodsTotal={task.dods.length}
        onExpand={onToggleCollapse}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskChecklistSection
        icon={ListChecks}
        title="Requirements"
        subtitle="Core deliverables required before committing scope"
        completedCount={completedSteps}
        totalCount={task.steps.length}
        iconClassName="bg-primary-soft text-primary-foreground"
        action={
          onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse checklist"
              title="Collapse checklist"
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelRightClose className="size-3.5" aria-hidden="true" />
            </button>
          ) : undefined
        }
      >
        {task.steps.length > 0 ? (
          task.steps.map((step) => (
            <TaskChecklistItem
              key={step.id}
              label={step.value}
              checked={step.status === 'completed'}
              onToggle={(checked) =>
                updateStepStatus({
                  taskId,
                  stepId: step.id,
                  status: checked ? 'completed' : 'todo',
                })
              }
            />
          ))
        ) : (
          <EmptyChecklist label="No requirements have been added to this task yet." />
        )}
      </TaskChecklistSection>

      <TaskChecklistSection
        icon={BadgeCheck}
        title="Definition of done"
        subtitle="Verification criteria before closing this task"
        completedCount={completedDods}
        totalCount={task.dods.length}
        iconClassName="bg-accent-secondary-soft text-accent-secondary-foreground"
      >
        {task.dods.length > 0 ? (
          task.dods.map((dod) => (
            <TaskChecklistItem
              key={dod.id}
              label={dod.value}
              checked={dod.status === 'completed'}
              onToggle={(checked) =>
                updateDodStatus({
                  taskId,
                  dodId: dod.id,
                  status: checked ? 'completed' : 'todo',
                })
              }
            />
          ))
        ) : (
          <EmptyChecklist label="No definition-of-done criteria have been added yet." />
        )}
      </TaskChecklistSection>
    </div>
  );
};

export default TaskSummarySection;
