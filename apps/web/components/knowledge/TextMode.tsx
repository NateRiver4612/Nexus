'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ArrowLeft, ClipboardType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormInput } from '../FormInput';
import { FormTextArea } from '../FormTextArea';
import { collectUrls } from '@nexus/shared-helpers';
import { createKnowledgeSourcesSchema } from '@nexus/zod-schemas';
import type { CreateKnowledgeSourcesInputType } from '@nexus/types';
import { DetectedLinks } from '../DetectedLinks';
import {
  MAX_DETECTED_LINKS,
  toLinkEntry,
  type CreateCallback,
  type SourceFormValues,
} from '../UploadKnowledgeSource';

export function TextMode({
  existingUrls,
  onCreate,
  onBack,
  onHandleSubmit,
}: {
  existingUrls: Set<string>;
  onCreate: CreateCallback;
  onHandleSubmit?: () => void;
  onBack: () => void;
}) {
  const {
    getValues,
    resetField,
    clearErrors,
    setError: setFormError,
  } = useFormContext<SourceFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Links found in the text that was just saved, waiting for the person's choice.
  const [detected, setDetected] = useState<string[] | null>(null);

  const handleAddDetected = async (urls: string[]) => {
    if (urls.length > 0) {
      const result = createKnowledgeSourcesSchema.safeParse(urls.map(toLinkEntry));
      if (!result.success)
        throw new Error(
          result.error.issues[0]?.message ?? 'URL should start with http:// or https://',
        );

      await onCreate(result.data);
    }

    onHandleSubmit?.();
  };

  const handleSubmit = async () => {
    clearErrors(['textTitle', 'textContent']);

    const textContent = getValues('textContent');
    const entry: CreateKnowledgeSourcesInputType[number] = {
      sourceType: 'copied_text',
      textTitle: getValues('textTitle'),
      textContent,
    };

    const result = createKnowledgeSourcesSchema.safeParse([entry]);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[1] as 'textTitle' | 'textContent';

        setFormError(field, { type: 'manual', message: issue.message });
      }
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await onCreate(result.data);

      const errorMessage = res.data?.[0]?.errorMessage;

      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      // The text is saved. Offer its links before leaving, so the person decides what is imported.
      const found = collectUrls({ text: textContent }).filter((url) => !existingUrls.has(url));

      if (found.length > 0) {
        resetField('textTitle');
        resetField('textContent');
        setDetected(found);
        return;
      }

      onHandleSubmit?.();

      setTimeout(() => {
        resetField('textTitle');
        resetField('textContent');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add text.');
    } finally {
      setSubmitting(false);
    }
  };

  if (detected) {
    return (
      <DetectedLinks
        urls={detected.slice(0, MAX_DETECTED_LINKS)}
        hiddenCount={Math.max(0, detected.length - MAX_DETECTED_LINKS)}
        onAdd={handleAddDetected}
        onSkip={() => onHandleSubmit?.()}
      />
    );
  }

  return (
    <div className="space-y-4 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="flex justify-between"
          onClick={() => {
            onBack();
            clearErrors('textTitle');
            clearErrors('textContent');
            (resetField('textTitle'), resetField('textContent'));
          }}
        >
          <ArrowLeft size={18} />
          <p>Copied Text</p>
        </Button>
        <ClipboardType size={20} />
      </div>
      <div className="space-y-2">
        <FormInput
          name="textTitle"
          label="Title"
          placeholder="Meeting notes, snippet, etc."
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <FormTextArea name="textContent" label="Content" rows={8} placeholder="Paste text here…" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Adding…' : 'Add text'}
      </Button>
      {error && <p className="flex items-center gap-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
