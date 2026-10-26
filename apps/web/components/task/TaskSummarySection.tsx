import { useCompleteTask, useUpdateTaskDodStatus, useUpdateTaskStepStatus } from '@/hooks/useTasks';
import type { TaskDetailType } from '@nexus/types';
import { Checkbox } from '../ui/checkbox';
import { Check } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

const TaskSummarySectionSkeleton = () => {
  return (
    <Card className="bg-white w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-gray-400 text-sm font-semibold uppercase">Goal</span>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-gray-400 text-sm font-semibold uppercase">Requirements</span>
        <ul className="space-y-3 text-sm">
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-5 flex-1" />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-gray-400 text-sm font-semibold uppercase">Definition of done</span>
        <ul className="space-y-3 text-sm">
          {[0, 1].map((index) => (
            <li key={index} className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-5 flex-1" />
            </li>
          ))}
        </ul>
      </div>

      <Skeleton className="h-8 w-32 rounded-lg" />
    </Card>
  );
};

const TaskSummarySection = ({
  task,
  isLoading,
}: {
  task?: TaskDetailType;
  isLoading?: boolean;
}) => {
  const { mutate: updateDodStatus } = useUpdateTaskDodStatus();
  const { mutate: updateStepStatus } = useUpdateTaskStepStatus();
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask();

  if (isLoading || !task) {
    return <TaskSummarySectionSkeleton />;
  }

  const taskId = task.id;

  const steps = task.steps;
  const dods = task.dods;
  const allDodsDone = dods.every((dod) => dod.status === 'completed');
  const isTaskDone = task.status === 'completed';

  return (
    <Card className="bg-white w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-gray-400 text-sm font-semibold uppercase">Goal</span>
        <p>{task.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-gray-400 text-sm font-semibold uppercase">Requirements</span>
        <ul className="space-y-3 text-sm">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Checkbox
                id={`step-${s.id}`}
                className="data-[state=checked]:bg-gray-100 data-[state=checked]:border-gray-400 data-[state=checked]:text-green-600"
                checked={s.status === 'completed'}
                onCheckedChange={(checked) =>
                  updateStepStatus({
                    taskId,
                    stepId: s.id,
                    status: checked ? 'completed' : 'todo',
                  })
                }
              />
              <label
                htmlFor={`step-${s.id}`}
                className={s.status === 'completed' ? 'line-through opacity-60' : ''}
              >
                {s.value}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-gray-400 text-sm font-semibold uppercase">Definition of done</span>
        <ul className="space-y-3 text-sm">
          {dods.map((dod) => (
            <li className="flex items-center gap-2" key={dod.id}>
              <Checkbox
                id={`dod-${dod.id}`}
                checked={dod.status === 'completed'}
                className="data-[state=checked]:bg-gray-100 data-[state=checked]:border-gray-400 data-[state=checked]:text-green-600"
                onCheckedChange={(checked) =>
                  updateDodStatus({
                    taskId,
                    dodId: dod.id,
                    status: checked ? 'completed' : 'todo',
                  })
                }
              />
              <label
                htmlFor={`dod-${dod.id}`}
                className={dod.status === 'completed' ? 'line-through opacity-60' : ''}
              >
                {dod.value}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="default"
        onClick={() => completeTask(taskId)}
        disabled={!allDodsDone || isTaskDone || isCompleting}
        className="w-fit flex items-center"
      >
        <Check size={16} />
        <p>{isTaskDone ? 'Task completed' : isCompleting ? 'Completing…' : 'Mark Complete'}</p>
      </Button>
    </Card>
  );
};

export default TaskSummarySection;
