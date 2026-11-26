'use client';

import type { TaskDetailType } from '@nexus/types';
import { Check, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useCompleteTask } from '@/hooks/useTasks';

type TaskActionBarProps = {
  task: TaskDetailType;
  /** Reports elapsed focus minutes so the sidebar's momentum card can mirror them. */
  onLoggedMinutesChange: (minutes: number) => void;
};

const formatTimer = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** Compact timer + Mark Complete group, mirrored into the breadcrumb row. */
const TaskActionBar = ({ task, onLoggedMinutesChange }: TaskActionBarProps) => {
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask();

  const totalSeconds = (task.estimatedTimeMinutes ?? 25) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);

  // A different task (or a changed estimate) starts the focus timer fresh.
  useEffect(() => {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
  }, [task.id, totalSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemainingSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (remainingSeconds === 0 && isRunning) {
      setIsRunning(false);
    }
  }, [remainingSeconds, isRunning]);

  useEffect(() => {
    if (task.status === 'completed') {
      setIsRunning(false);
    }
  }, [task.status]);

  const loggedMinutes = Math.max(0, Math.floor((totalSeconds - remainingSeconds) / 60));

  // Minute-granularity only: the page (and the whole editor tree) shouldn't re-render every second.
  useEffect(() => {
    onLoggedMinutesChange(loggedMinutes);
  }, [loggedMinutes, onLoggedMinutesChange]);

  const allDodsDone = task.dods.every((dod) => dod.status === 'completed');
  const isTaskDone = task.status === 'completed';

  const toggleTimer = () => {
    if (!isRunning && remainingSeconds === 0) {
      setRemainingSeconds(totalSeconds);
    }

    setIsRunning((running) => !running);
  };

  const resetTimer = () => {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 shadow-2xs">
        <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-16 text-sm font-bold tabular-nums text-foreground">
          {formatTimer(remainingSeconds)}
        </span>
        <button
          type="button"
          onClick={toggleTimer}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          title={isRunning ? 'Pause timer' : 'Start timer'}
          className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:brightness-95"
        >
          {isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          aria-label="Reset timer"
          title="Reset timer"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <Button
        type="button"
        size="md"
        onClick={() => completeTask(task.id)}
        disabled={!allDodsDone || isTaskDone || isCompleting}
        aria-busy={isCompleting || undefined}
        className="shrink-0"
      >
        <Check className="size-3.5 text-accent" aria-hidden="true" />
        {isTaskDone ? 'Task completed' : isCompleting ? 'Completing…' : 'Mark Complete'}
      </Button>
    </div>
  );
};

export default TaskActionBar;
