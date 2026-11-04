'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GenerateResearchDialog } from '@/components/project/GenerateResearchDialog';
import ProjectGeneral from '@/components/project/ProjectGeneral';
import ProjectMilestonesTasks, {
  type PlanMilestone,
  type PlanTask,
} from '@/components/project/ProjectMilestonesTasks';
import { ProjectResearchSources } from '@/components/project/ProjectResearchSources';
import ProjectSummary from '@/components/project/ProjectSummary';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAiRun } from '@/hooks/useAi';
import { useGetMilestones, useUpdateMilestonesPositions } from '@/hooks/useMilestones';
import { useGetProjectById } from '@/hooks/useProjects';
import {
  useGetActiveProjectResearch,
  useGetProjectResearchHistory,
  useStartProjectResearch,
} from '@/hooks/useResearch';
import { researchKeys } from '@/hooks/queryKeys';
import { useReopenTask, useUpdateTask } from '@/hooks/useTasks';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ResearchSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
};

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

  const { data: activeResearch } = useGetActiveProjectResearch({
    variables: projectId,
  });

  const activeResearchRunId = activeResearch?.runId ?? '';
  const { data: activeAiRun } = useGetAiRun({ variables: activeResearchRunId });

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const handledRunRef = useRef<string | null>(null);

  const { mutate: startResearch, isPending: isStarting } = useStartProjectResearch({
    onSuccess: () => setIsGenerateOpen(false),
    onError: toastError,
  });

  const isGenerating =
    Boolean(activeResearchRunId) &&
    (!activeAiRun || activeAiRun.status === 'queued' || activeAiRun.status === 'processing');

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
    } else if (activeAiRun.status === 'failed') {
      handledRunRef.current = activeResearchRunId;

      toastError(new Error(activeAiRun.errorMessage ?? 'Research failed'));

      queryClient.invalidateQueries({ queryKey: researchKeys.active(projectId) });
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

  // History is oldest-first; assign 1-based versions and render newest first.
  const versions = (researchHistory ?? [])
    .map((research, index) => ({ research, version: index + 1 }))
    .reverse();

  return (
    <div className="flex flex-col gap-4">
      <ProjectGeneral data={project} isLoading={isProjectLoading}></ProjectGeneral>
      <ProjectSummary
        summary={project?.summary ?? null}
        isLoading={isProjectLoading}
      ></ProjectSummary>
      <ProjectMilestonesTasks
        milestones={milestones}
        isLoading={isMilestonesLoading}
        onContinueTask={handleContinueTask}
        onOrderChange={handleOrderChange}
        currentTaskId={project?.currentTask?.id ?? null}
        onActivateTask={handleActivateTask}
        onReopenTask={handleReopenTask}
      />

      <Card className="flex flex-col gap-4 border border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Research</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerateOpen(true)}
            disabled={isGenerating}
          >
            <RefreshCw className={cn('size-4', isGenerating && 'animate-spin')} />
            Generate
          </Button>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-4 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Researching sources…
          </div>
        )}

        {isHistoryLoading && versions.length === 0 && !isGenerating && <ResearchSkeleton />}

        {!isHistoryLoading && !isGenerating && versions.length === 0 && (
          <div className="rounded-lg border border-gray-200 p-4 text-sm text-muted-foreground">
            No research yet — generate sources for this project.
          </div>
        )}

        {versions.map(({ research, version }, index) => (
          <Accordion
            key={research.id}
            type="single"
            collapsible
            defaultValue={index === 0 ? `research-${research.id}` : undefined}
            className="rounded-lg border border-gray-200 shadow"
          >
            <AccordionItem value={`research-${research.id}`} className="w-full border-b-0">
              <div className="flex w-full items-center gap-1 rounded-t-lg px-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <span className="truncate text-sm font-medium text-gray-400">
                      Version {version}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {research.sources.length} sources
                    </span>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="pb-2">
                <ProjectResearchSources sources={research.sources} bare className="px-3" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </Card>

      <GenerateResearchDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onConfirm={handleGenerate}
        isPending={isStarting}
      />
    </div>
  );
}
