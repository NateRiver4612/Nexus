'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { onboardingStep3Schema } from '@nexus/zod-schemas';
import type { OnboardingStep3InputType } from '@nexus/types';

import {
  UploadKnowledgeSource,
  type SourceFileMeta,
  type SourceFormValues,
} from '../UploadKnowledgeSource';
import { useGetKnowledgeSources } from '@/hooks/useKnowledge';

import type { StepHandle } from './shared';

type Step3Props = {
  ref?: React.Ref<StepHandle>;
  projectId?: string;
  onSave: (data: OnboardingStep3InputType) => Promise<unknown>;
};

export function Step3({ ref, projectId, onSave }: Step3Props) {
  const { data: sources } = useGetKnowledgeSources({
    variables: projectId,
  });
  const [error, setError] = React.useState<string | null>(null);

  const serverFiles: SourceFileMeta[] = (sources ?? [])
    .filter((row) => row.sourceType === 'file')
    .map((row) => ({ name: row.name, size: row.size, mimeType: row.mimeType ?? null }));

  const form = useForm<SourceFormValues>({
    values: { files: serverFiles, link: '', textTitle: '', textContent: '' },
    resetOptions: { keepDirtyValues: true },
  });

  const {
    formState: { isDirty },
  } = form;

  React.useImperativeHandle(ref, () => ({
    save: async () => {
      const rows = sources ?? [];

      const files = rows
        .filter((row) => row.sourceType === 'file')
        .map((row) => ({ name: row.name, size: row.size, mimeType: row.mimeType ?? null }));
      const urlRow = rows.find(
        (row) => (row.sourceType === 'url' || row.sourceType === 'youtube') && row.sourceRef,
      );
      const textRow = rows.find((row) => row.sourceType === 'copied_text');

      const data: OnboardingStep3InputType = {
        files,
        link: urlRow?.sourceRef ?? null,
        textTitle: textRow?.name ?? null,
        textContent: textRow?.content ?? null,
      };

      if (files.length === 0 && !data.link && !data.textTitle) {
        setError('Add at least one source before continuing.');
        return false;
      }

      const parsed = onboardingStep3Schema.safeParse(data);

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Please review the sources.');
        return false;
      }

      setError(null);

      if (!isDirty) {
        return true;
      }

      await onSave(parsed.data);
      // Mark the form clean so `isDirty` reflects only changes made since the
      // last save — otherwise the skip-if-no-changes branch above never fires
      // again after the first upload (files are retained in the form state).
      form.reset();
      return true;
    },
  }));

  if (!projectId) {
    return (
      <div className="space-y-3 text-left text-sm text-muted-foreground">
        <p>Finish step 1 first — the project has to exist before sources can be added.</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-4 text-left">
        <UploadKnowledgeSource projectId={projectId} />
        {error && <p className="flex items-center gap-1.5 text-sm text-destructive">{error}</p>}
      </div>
    </FormProvider>
  );
}
