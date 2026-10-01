'use client';

import { useParams, useRouter } from 'next/navigation';

import ProjectMilestonesTasks, {
  type PlanMilestone,
  type PlanTask,
} from '@/components/project/ProjectMilestonesTasks';
import ProjectGeneral from '@/components/project/ProjectGeneral';
import { useGetMilestones, useUpdateMilestonesPositions } from '@/hooks/useMilestones';
import { useGetProjectById } from '@/hooks/useProjects';
import { useUpdateTask } from '@/hooks/useTasks';
import ProjectSummary from '@/components/project/ProjectSummary';

/** The "current" task is the first non-completed task of the first non-completed milestone. */
function findCurrentTask(milestones: PlanMilestone[]): PlanTask | undefined {
  const activeMilestone = milestones.find((m) => m.tasks.some((t) => t.status !== 'completed'));
  return activeMilestone?.tasks.find((t) => t.status !== 'completed');
}

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

    // First use-case of the generic task update: the reorder may have made a
    // task the current/active one — promote it (status + project currentTaskId
    // both happen in the one PATCH, server-side).
    const currentTask = findCurrentTask(ordered);

    if (currentTask && currentTask.status !== 'in_progress') {
      updateTask({ taskId: currentTask.id, input: { status: 'in_progress' } });
    }
  };

  const handleContinueTask = (_milestone: PlanMilestone, task: PlanTask) => {
    router.push(`/tasks/${task.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <ProjectGeneral data={project}></ProjectGeneral>
      <ProjectSummary summary={project.summary}></ProjectSummary>
      <ProjectMilestonesTasks
        milestones={milestones}
        onContinueTask={handleContinueTask}
        onOrderChange={handleOrderChange}
      />
    </div>
  );
}
