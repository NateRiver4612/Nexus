'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteProject, useGetProjectById, useUpdateProject } from '@/hooks/useProjects';

export const ProjectSettingsView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const { data: project } = useGetProjectById({ variables: projectId });

  const [nameDraft, setNameDraft] = useState(project?.name ?? '');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (project?.name !== undefined) {
      setNameDraft(project.name);
    }
  }, [project?.name]);

  const { mutate: updateProject, isPending: isRenaming } = useUpdateProject(projectId);
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  const nameChanged = nameDraft.trim() !== (project?.name ?? '');
  const canRename = Boolean(project) && nameChanged && nameDraft.trim().length > 0;

  const handleRename = () => {
    if (!canRename) return;
    updateProject({ name: nameDraft.trim() });
  };

  const handleConfirmDelete = () => {
    deleteProject(projectId, {
      onSuccess: () => router.push('/projects'),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">General</h2>
        <div className="space-y-2">
          <Label htmlFor="project-name">Project name</Label>
          <div className="flex gap-2">
            <Input
              id="project-name"
              value={nameDraft}
              disabled={!project || isRenaming}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={255}
            />
            <Button
              onClick={handleRename}
              disabled={!canRename || isRenaming}
              isLoading={isRenaming}
              className="shrink-0"
            >
              Save
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-destructive bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-destructive">Advanced</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Delete project</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this project and everything in it.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 text-destructive hover:bg-destructive hover:text-white"
            disabled={!project}
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete project
          </Button>
        </div>
      </section>

      <DeleteConfirmDialog
        open={isDeleteOpen}
        close={() => setIsDeleteOpen(false)}
        confirmDelete={handleConfirmDelete}
        error={null}
        isDeleting={isDeleting}
        title="Delete project?"
        requiredText={project?.name}
        content={`This permanently deletes “${project?.name ?? ''}” and all of its tasks, milestones, artifacts, knowledge sources, and conversations. This action cannot be undone.`}
      />
    </div>
  );
};
