'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Link2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '../ui/label';
import { FormInput } from '../FormInput';
import { collectUrls } from '@nexus/shared-helpers';
import { createKnowledgeSourcesSchema } from '@nexus/zod-schemas';
import {
  MAX_LINKS_PER_ADD,
  toLinkEntry,
  type CreateCallback,
  type SourceFormValues,
} from '../UploadKnowledgeSource';

export function LinkMode({
  existingUrls,
  onCreate,
  onHandleSubmit,
  onBack,
}: {
  existingUrls: Set<string>;
  onHandleSubmit?: () => void;
  onCreate: CreateCallback;
  onBack: () => void;
}) {
  const { getValues, resetField } = useFormContext<SourceFormValues>();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // The hint under the field promises several URLs separated by spaces or new lines.
    const urls = collectUrls({ text: getValues('link') });
    if (urls.length === 0) {
      setError('URL should start with http:// or https://');
      return;
    }

    const fresh = urls.filter((url) => !existingUrls.has(url)).slice(0, MAX_LINKS_PER_ADD);
    if (fresh.length === 0) {
      setError('These links are already added.');
      return;
    }

    const result = createKnowledgeSourcesSchema.safeParse(fresh.map(toLinkEntry));
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'URL should start with http:// or https://');
      return;
    }

    setError(null);

    try {
      await onCreate(result.data);
      resetField('link');
      onHandleSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add link.');
    }
  };

  return (
    <div className="space-y-4 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="flex justify-between" onClick={onBack}>
          <ArrowLeft size={18} />
          <Label htmlFor="knowledge-link">Website or YouTube URL</Label>
        </Button>
        <div className="flex items-center gap-2">
          <Link2 size={20} />
          <div className="p-1 px-2 bg-red-500 rounded-sm">
            <Play color="white" strokeWidth={8} enableBackground={'white'} size={6} />
          </div>
        </div>
      </div>
      <FormInput
        name="link"
        placeholder="https://…"
        autoFocus
        trailingIcon={ArrowRight}
        onTrailingIconClick={handleSubmit}
      />
      <ul className=" text-xs text-muted-foreground list-disc text-start w-full list-inside space-y-1">
        <li>To add multiple URLs, separate with a space or new line. </li>
        <li>Only the visible text on the website will be imported at this time.</li>
        <li>Paid articles are not supported. Only the</li>
        <li>text transcript in YouTube will be imported at this time.</li>
        <li>Only public YouTube videos are supported.</li>
        <li>Recently uploaded videos may not be available to import.</li>
      </ul>
      {error && <p className="flex items-center gap-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
