'use client';

import { Pencil } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { useUpdateProject } from '@/hooks/useProjects';

type EditableProjectTitleProps = {
  projectId: string;
  name: string;
};

export const EditableProjectTitle = ({ projectId, name }: EditableProjectTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const { mutate: updateProject, isPending } = useUpdateProject(projectId);

  const startEditing = () => {
    if (isPending) {
      return;
    }

    setDraft(name);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(name);
    setIsEditing(false);
  };

  const commitEditing = () => {
    const nextName = draft.trim();

    if (!nextName || nextName === name) {
      cancelEditing();
      return;
    }

    setIsEditing(false);
    updateProject({ name: nextName });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEditing();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={draft}
        disabled={isPending}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commitEditing}
        onKeyDown={handleKeyDown}
        maxLength={255}
        aria-label="Project name"
        className="min-w-0 flex-1 border-b border-border bg-transparent text-3xl font-bold outline-none"
      />
    );
  }

  return (
    <div className="group flex min-w-0 items-center gap-2">
      <h1 className="min-w-0">
        <button
          type="button"
          onClick={startEditing}
          disabled={isPending}
          className="max-w-full cursor-text truncate text-left text-3xl font-bold"
        >
          {name}
        </button>
      </h1>
      <button
        type="button"
        onClick={startEditing}
        disabled={isPending}
        aria-label="Rename project"
        className="cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
};
