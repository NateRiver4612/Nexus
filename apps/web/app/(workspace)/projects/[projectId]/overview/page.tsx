'use client';

import { useParams, useRouter } from 'next/navigation';

import ProjectMilestonesTasks, {
  type PlanMilestone,
  type PlanTask,
} from '@/components/project/ProjectMilestonesTasks';
import ProjectGeneral from '@/components/project/ProjectGeneral';
import { useGetMilestones, useUpdateMilestonesPositions } from '@/hooks/useMilestones';
import { useGetProjectById } from '@/hooks/useProjects';
import { useReopenTask, useUpdateTask } from '@/hooks/useTasks';
import ProjectSummary from '@/components/project/ProjectSummary';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();

  const router = useRouter();

  const { data: project } = useGetProjectById({
    variables: projectId,
  });

  const { data: milestones } = useGetMilestones({
    variables: projectId,
  });

  const { mutate: updateMilestonesPositions } = useUpdateMilestonesPositions();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: reopenTask } = useReopenTask();

  if (!project || !milestones) {
    return <></>;
  }

  // The component hands us the complete, authoritative order after every drag —
  // we persist it as-is. No local mirror/ref, no debounce: each callback is a
  // single consistent snapshot, so a cross-milestone move can never send a task
  // in two lists at once.
  const handleOrderChange = (ordered: PlanMilestone[]) => {
    updateMilestonesPositions({
      projectId,
      input: {
        milestones: ordered.map((m) => ({
          id: m.id,
          tasks: m.tasks.map((t) => ({ id: t.id })),
        })),
      },
    });
  };

  // The user chooses which task to work on via the row's hover "Activate" button.
  // Reusing the generic task update: setting `status: 'in_progress'` makes it the
  // current task (project_progress.currentTaskId) — and the previous current task
  // is paused, all server-side.
  const handleActivateTask = (_milestone: PlanMilestone, task: PlanTask) => {
    if (task.status === 'in_progress') return;
    updateTask({ taskId: task.id, input: { status: 'in_progress' } });
  };

  const handleContinueTask = (_milestone: PlanMilestone, task: PlanTask) => {
    router.push(`/tasks/${task.id}`);
  };

  const handleReopenTask = (_milestone: PlanMilestone, task: PlanTask) => {
    reopenTask(task.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <ProjectGeneral data={project}></ProjectGeneral>
      <ProjectSummary summary={project.summary}></ProjectSummary>
      <ProjectMilestonesTasks
        milestones={milestones}
        onContinueTask={handleContinueTask}
        onOrderChange={handleOrderChange}
        currentTaskId={project.currentTask?.id ?? null}
        onActivateTask={handleActivateTask}
        onReopenTask={handleReopenTask}
      />
    </div>
  );
}
