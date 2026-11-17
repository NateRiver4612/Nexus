'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import ProjectGeneral from '@/components/project/ProjectGeneral';
import ProjectMilestonesTasks, {
  type PlanMilestone,
  type PlanTask,
} from '@/components/project/ProjectMilestonesTasks';
import ProjectResearchHub from '@/components/project/ProjectResearchHub';
import ProjectSummary from '@/components/project/ProjectSummary';
import { useGetAiRun } from '@/hooks/useAi';
import { useGetMilestones, useUpdateMilestonesPositions } from '@/hooks/useMilestones';
import { useGetProjectById } from '@/hooks/useProjects';
import {
  useGetActiveProjectResearch,
  useGetProjectResearch,
  useGetProjectResearchHistory,
  useStartProjectResearch,
} from '@/hooks/useResearch';
import { researchKeys } from '@/hooks/queryKeys';
import { useReopenTask, useUpdateTask } from '@/hooks/useTasks';
import { toastError } from '@/lib/toast';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isProjectLoading } = useGetProjectById({
    variables: projectId,
  });

  const { data: milestones, isLoading: isMilestonesLoading } = useGetMilestones({
    variables: projectId,
  });

  const { data: researchHistory, isLoading: isHistoryLoading } = useGetProjectResearchHistory({
    variables: projectId,
  });

  const { data: latestResearch } = useGetProjectResearch({
    variables: projectId,
  });

  const { data: activeResearch } = useGetActiveProjectResearch({
    variables: projectId,
  });

  const activeResearchRunId = activeResearch?.runId ?? '';
  const { data: activeAiRun } = useGetAiRun({ variables: activeResearchRunId });

  const handledRunRef = useRef<string | null>(null);

  const { mutate: startResearch, isPending: isStarting } = useStartProjectResearch({
    onError: toastError,
  });

  const isGenerating =
    Boolean(activeResearchRunId) &&
    (!activeAiRun || activeAiRun.status === 'queued' || activeAiRun.status === 'processing');

  // The latest attempt covers kickoff failures, which have no active run and therefore no toast.
  const researchFailed = latestResearch?.status === 'failed';

  // Toast once per completed/failed run, then refresh the version list.
  useEffect(() => {
    if (!activeResearchRunId || !activeAiRun) return;
    // No need to toast again for the same run - it may be polled multiple times before the completed/failed
    if (handledRunRef.current === activeResearchRunId) return;

    if (activeAiRun.status === 'completed') {
      handledRunRef.current = activeResearchRunId;

      toast.success('Research complete');

      queryClient.invalidateQueries({ queryKey: researchKeys.history(projectId) });
      queryClient.invalidateQueries({ queryKey: researchKeys.active(projectId) });
      queryClient.invalidateQueries({ queryKey: researchKeys.project(projectId) });
    } else if (activeAiRun.status === 'failed') {
      handledRunRef.current = activeResearchRunId;

      toastError(new Error(activeAiRun.errorMessage ?? 'Research failed'));

      queryClient.invalidateQueries({ queryKey: researchKeys.active(projectId) });
      queryClient.invalidateQueries({ queryKey: researchKeys.project(projectId) });
    }
  }, [activeAiRun, activeResearchRunId, projectId, queryClient]);

  const { mutate: updateMilestonesPositions } = useUpdateMilestonesPositions();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: reopenTask } = useReopenTask();

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

  const handleGenerate = ({ reason, sourceLimit }: { reason?: string; sourceLimit?: number }) => {
    startResearch({ projectId, reason, sourceLimit });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-5 xl:grid-cols-12">
        <ProjectGeneral data={project} isLoading={isProjectLoading} className="xl:col-span-7" />
        <ProjectSummary
          project={project}
          milestones={milestones}
          isLoading={isProjectLoading || isMilestonesLoading}
          className="xl:col-span-5"
        />
      </div>
      <ProjectMilestonesTasks
        projectId={projectId}
        keyTopics={project?.summary?.keyTopics ?? []}
        milestones={milestones}
        isLoading={isMilestonesLoading}
        onContinueTask={handleContinueTask}
        onOrderChange={handleOrderChange}
        currentTaskId={project?.currentTask?.id ?? null}
        onActivateTask={handleActivateTask}
        onReopenTask={handleReopenTask}
      />

      <ProjectResearchHub
        history={researchHistory ?? []}
        isLoading={isHistoryLoading}
        isGenerating={isGenerating}
        activeStage={activeAiRun?.stage ?? null}
        researchFailed={researchFailed}
        isStarting={isStarting}
        onStartResearch={handleGenerate}
      />
    </div>
  );
}
