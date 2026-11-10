'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { ClipboardType, Link2, Play, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createKnowledgeSourcesSchema, fileSchema } from '@nexus/zod-schemas';
import type { CreateKnowledgeSourcesInputType, KnowledgeSourceListType } from '@nexus/types';
import { useCreateKnowledgeUploadUrl } from '@/hooks/useKnowledge';
import type { CreateCallback, SourceFileMeta, SourceFormValues } from '../UploadKnowledgeSource';
import { SourceList } from './SourceList';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.webp';

/**
 * Normalizes either a real `File`, a form `SourceFileMeta`, or a server source
 * row to the shape the "already added" check compares against.
 */
function getFormatFile(entry: File | SourceFileMeta | KnowledgeSourceListType[number]) {
  return {
    name: entry.name,
    size: entry.size,
    type: entry instanceof File ? entry.type : (entry.mimeType ?? ''),
  };
}

export function FileMode({
  projectId,
  onCreate,
  onAddLink,
  onAddText,
  defaultFiles,
  onHandleSubmit,
}: {
  projectId: string;
  onCreate: CreateCallback;
  onAddLink: () => void;
  onAddText: () => void;
  defaultFiles?: KnowledgeSourceListType;
  onHandleSubmit?: () => void;
}) {
  const { getValues, setValue, watch } = useFormContext<SourceFormValues>();
  const files = watch('files');

  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: getUploadUrl } = useCreateKnowledgeUploadUrl(projectId);

  const appendFiles = useCallback(
    (incoming: File[]) => {
      setValue('files', [...getValues('files'), ...incoming]);
    },
    [getValues, setValue],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const validated: File[] = [];

      for (const file of Array.from(fileList)) {
        const result = fileSchema.safeParse(file);

        const isFileAdded = [...files, ...(defaultFiles ?? [])].some((v) => {
          const added = getFormatFile(v);
          return added.name === file.name && added.size === file.size && added.type === file.type;
        });

        if (isFileAdded) {
          setError(`${file.name} already added.`);
          return;
        }

        if (!result.success) {
          setError(`${file.name}: ${result.error.issues[0]?.message}`);
          return;
        }
        validated.push(file);
      }

      appendFiles(validated);
      setSubmitting(true);

      try {
        const uploaded = await Promise.all(validated.map(uploadFile));
        const input = createKnowledgeSourcesSchema.parse(uploaded);
        await onCreate(input);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add sources.');
      } finally {
        setSubmitting(false);
      }

      onHandleSubmit?.();
      setError(null);
    },
    [appendFiles, defaultFiles, files],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      setValue(
        'files',
        getValues('files').filter((_, i) => i !== index),
      );
    },
    [getValues, setValue],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<CreateKnowledgeSourcesInputType[number]> => {
      const { key, url } = await getUploadUrl({
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      return {
        sourceType: 'file',
        name: file.name,
        mimeType: file.type,
        storageKey: key,
        size: file.size,
      };
    },
    [getUploadUrl],
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col mb-4 items-center justify-center bg-background/50 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <p className="font-semibold text-gray-900">
          Drag and drop files here, or choose a source below
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          PDF, DOCX, XLSX, CSV, TXT, MD, or an image
        </p>
        <div className="flex justify-center flex-wrap gap-2 pt-6">
          <Button
            variant="outline"
            className="flex border border-gray-300 rounded-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" color="black" />
            <span className="text-sm text-black">Upload files</span>
          </Button>
          <Button
            variant="outline"
            className="flex border border-gray-300 rounded-full gap-2"
            onClick={onAddLink}
          >
            <Link2 className="size-4" color="black" />
            <div className="p-1 px-2 bg-red-500 rounded-sm">
              <Play color="white" strokeWidth={8} enableBackground={'white'} size={6} />
            </div>
            <span className="text-sm text-black">Add link</span>
          </Button>
          <Button
            variant="outline"
            className="flex border border-gray-300 rounded-full gap-2"
            onClick={onAddText}
          >
            <ClipboardType className="size-4" color="black" />
            <span className="text-sm text-black">Copied text</span>
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        name="files"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <SourceList projectId={projectId} showEmptyText={false} />

      {error && <p className="flex items-center gap-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
