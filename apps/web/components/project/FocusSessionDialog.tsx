'use client';

import type { TaskType } from '@nexus/types';
import { Check, Circle, CircleCheck, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGetTask, useCompleteTask, useUpdateTaskDodStatus } from '@/hooks/useTasks';

import DifficultyIndicator from '../DifficultyIndicator';

export type FocusTask = Pick<
  TaskType,
  'id' | 'title' | 'description' | 'difficulty' | 'estimatedTimeMinutes' | 'status' | 'dods'
>;

type FocusSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: FocusTask | null;
  milestoneLabel?: string;
  milestoneTitle?: string;
};

const TIMER_PRESETS = [25, 60] as const;
const DEFAULT_PRESET_MINUTES = 60;

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const FocusSessionDialog = ({
  open,
  onOpenChange,
  task,
  milestoneLabel,
  milestoneTitle,
}: FocusSessionDialogProps) => {
  const taskId = task?.id ?? '';
  const { data: taskDetail } = useGetTask({ variables: taskId });
  const { mutate: updateDod, isPending: isUpdatingDod } = useUpdateTaskDodStatus();
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask();

  const [presetMinutes, setPresetMinutes] = useState<number>(DEFAULT_PRESET_MINUTES);
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_PRESET_MINUTES * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimerRunning(false);
      return;
    }

    setPresetMinutes(DEFAULT_PRESET_MINUTES);
    setSecondsRemaining(DEFAULT_PRESET_MINUTES * 60);
    setTimerRunning(true);
  }, [open, task?.id]);

  useEffect(() => {
    if (!open || !timerRunning) return;

    const interval = setInterval(() => {
      setSecondsRemaining((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, timerRunning]);

  useEffect(() => {
    if (secondsRemaining === 0 && timerRunning) {
      setTimerRunning(false);
    }
  }, [secondsRemaining, timerRunning]);

  if (!task) return null;

  const activeTask = taskDetail ?? task;
  const dods = activeTask.dods;
  const completedDods = dods.filter((item) => item.status === 'completed').length;
  const allDodsDone = dods.length > 0 && completedDods === dods.length;

  const handlePreset = (minutes: number) => {
    setPresetMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setTimerRunning(false);
  };

  const handleComplete = () => {
    completeTask(task.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5">
        <div className="space-y-2 pr-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
              Deep Focus Session{milestoneLabel ? ` · ${milestoneLabel}` : ''}
            </span>
            <DifficultyIndicator difficulty={activeTask.difficulty} />
          </div>
          <DialogTitle>{activeTask.title}</DialogTitle>
          <DialogDescription>
            {milestoneTitle ?? 'Current focus'} · {formatTimer(secondsRemaining)} remaining
          </DialogDescription>
        </div>

        <div className="rounded-3xl border border-border bg-surface-secondary p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Session countdown
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {formatTimer(secondsRemaining)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                {TIMER_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => handlePreset(minutes)}
                    className={
                      presetMinutes === minutes
                        ? 'rounded-pill bg-action px-2.5 py-1 text-[11px] font-bold text-action-foreground'
                        : 'rounded-pill border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground'
                    }
                  >
                    {minutes}m Sprint
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTimerRunning((current) => !current)}
              >
                {timerRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {timerRunning ? 'Pause' : 'Resume'}
              </Button>
              <button
                type="button"
                aria-label="Reset timer"
                onClick={() => {
                  setSecondsRemaining(presetMinutes * 60);
                  setTimerRunning(false);
                }}
                className="flex size-9 items-center justify-center rounded-pill border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Definition of Done
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Clock className="size-3.5" />
              {completedDods}/{dods.length} complete
            </span>
          </div>

          {dods.length > 0 ? (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {dods.map((dod) => {
                const done = dod.status === 'completed';

                return (
                  <button
                    key={dod.id}
                    type="button"
                    disabled={isUpdatingDod}
                    aria-pressed={done}
                    onClick={() =>
                      updateDod({
                        taskId: task.id,
                        dodId: dod.id,
                        status: done ? 'todo' : 'completed',
                      })
                    }
                    className={
                      done
                        ? 'flex w-full items-center gap-2.5 rounded-2xl bg-surface-secondary px-3.5 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors disabled:opacity-60'
                        : 'flex w-full items-center gap-2.5 rounded-2xl bg-surface-secondary px-3.5 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60'
                    }
                  >
                    {done ? (
                      <CircleCheck className="size-3.5 shrink-0 text-primary-foreground" />
                    ) : (
                      <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={done ? 'line-through' : undefined}>{dod.value}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-surface-secondary p-4 text-xs text-muted-foreground">
              This task has no definition-of-done items, so it cannot be completed here yet.
            </p>
          )}

          {!allDodsDone && dods.length > 0 && (
            <p className="text-[11px] font-medium text-muted-foreground">
              Complete every item above to advance to the next task.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!allDodsDone || isCompleting}
            isLoading={isCompleting}
          >
            <Check className="size-3.5" />
            Mark Complete & Advance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FocusSessionDialog;
