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
  defaults?: Partial<OnboardingStep3InputType> | null;
  onSave: (data: OnboardingStep3InputType) => Promise<unknown>;
};

export function Step3({ ref, projectId, defaults, onSave }: Step3Props) {
  const { data: sources } = useGetKnowledgeSources({
    variables: projectId ?? '',
  });
  const [error, setError] = React.useState<string | null>(null);

  const serverFiles: SourceFileMeta[] = (sources ?? [])
    .filter((row) => row.sourceType === 'file')
    .map((row) => ({ name: row.name, size: row.size, mimeType: row.mimeType ?? null }));

  const form = useForm<SourceFormValues>({
    values: { files: serverFiles, link: '', textTitle: '', textContent: '' },
    resetOptions: { keepDirtyValues: true },
  });

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

      // Skip the save when nothing changed since the last one — compare the
      // freshly-built payload (from the server's sources) against the last
      // saved snapshot instead of the form's dirty flag, which LinkMode and
      // TextMode intentionally clear after each successful add.
      if (defaults && step3Equals(defaults, parsed.data)) {
        return true;
      }

      await onSave(parsed.data);
      // Reset the form back to the server-derived baseline so the next save
      // comparison starts from a clean slate.
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

/** Deep-equality for the step 3 payload, treating null/undefined as equal.
 * Both arguments are allowed to be partial (e.g. a merged draft snapshot). */
function step3Equals(a: Partial<OnboardingStep3InputType>, b: Partial<OnboardingStep3InputType>) {
  if (
    (a.link ?? null) !== (b.link ?? null) ||
    (a.textTitle ?? null) !== (b.textTitle ?? null) ||
    (a.textContent ?? null) !== (b.textContent ?? null)
  ) {
    return false;
  }

  const aFiles = a.files ?? [];
  const bFiles = b.files ?? [];
  if (aFiles.length !== bFiles.length) return false;

  return aFiles.every(
    (file, index) =>
      file.name === bFiles[index]?.name &&
      file.size === bFiles[index]?.size &&
      (file.mimeType ?? null) === (bFiles[index]?.mimeType ?? null),
  );
}
