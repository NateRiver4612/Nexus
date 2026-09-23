'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  faFile,
  faFileCsv,
  faFileExcel,
  faFileImage,
  faFileLines,
  faFilePdf,
  faFileWord,
} from '@fortawesome/free-solid-svg-icons';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';
import { ArrowLeft, ArrowRight, ClipboardType, Link2, Play, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { FormInput } from './FormInput';
import { FormTextArea } from './FormTextArea';
import { createKnowledgeSourcesSchema, fileSchema } from '@nexus/zod-schemas';
import type { CreateKnowledgeSourcesInputType, KnowledgeSourceListType } from '@nexus/types';
import {
  useCreateKnowledgeSources,
  useCreateKnowledgeUploadUrl,
  useGetKnowledgeSources,
} from '@/hooks/useKnowledge';
import { useParams } from 'next/navigation';
import { isYouTubeUrl } from '@/lib/youtube';
import { SourceList } from './knowledge/SourceList';

/** Server-persisted file metadata — the form's `files` field can hold these
 * (seeded from existing sources) alongside real `File` objects added this session. */
export type SourceFileMeta = {
  name: string;
  size: number;
  mimeType: string | null;
};

export type SourceFormValues = {
  files: Array<File | SourceFileMeta>;
  link: string;
  textTitle: string;
  textContent: string;
};

type Mode = 'file' | 'link' | 'text';

type CreateCallback = (
  entries: CreateKnowledgeSourcesInputType,
) => Promise<KnowledgeSourceListType>;

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.webp';

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / k ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)}${units[i]}`;
}

export function fileIcon(file: { name: string; type: string }) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const { type } = file;
  if (type === 'application/pdf' || ext === 'pdf')
    return { icon: faFilePdf, color: 'text-red-600' };
  if (type.includes('wordprocessingml') || ext === 'docx')
    return { icon: faFileWord, color: 'text-blue-600' };
  if (type === 'text/csv' || ext === 'csv') return { icon: faFileCsv, color: 'text-emerald-600' };
  if (type.includes('spreadsheetml') || ext === 'xlsx')
    return { icon: faFileExcel, color: 'text-emerald-600' };
  if (type.startsWith('image/')) return { icon: faFileImage, color: 'text-violet-600' };
  if (type.startsWith('youtube'))
    return {
      icon: faYoutube,
      color: 'red',
    };
  if (ext === 'txt' || ext === 'md') return { icon: faFileLines, color: 'text-gray-600' };
  return { icon: faFile, color: 'text-gray-500' };
}

export function UploadKnowledgeSource({ projectId: projectIdProp }: { projectId?: string }) {
  const [mode, setMode] = useState<Mode>('file');

  // Explicit prop wins; fall back to the route param (project page).
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? paramProjectId ?? '';

  const createKnowledgeSources = useCreateKnowledgeSources(projectId);

  const { data: knowledgeSources } = useGetKnowledgeSources({ variables: projectId });

  const onCreate: CreateCallback = (entries) => {
    if (!projectId) throw new Error('Project not ready yet.');
    return createKnowledgeSources.mutateAsync(entries);
  };

  const files = knowledgeSources?.filter((k) => k.sourceType === 'file');

  return (
    <div>
      {mode === 'file' && (
        <FileMode
          projectId={projectId}
          onCreate={onCreate}
          defaultFiles={files}
          onAddLink={() => setMode('link')}
          onAddText={() => setMode('text')}
        />
      )}
      {mode === 'link' && (
        <LinkMode
          onHandleSubmit={() => {
            setMode('file');
          }}
          onCreate={onCreate}
          onBack={() => setMode('file')}
        />
      )}
      {mode === 'text' && (
        <TextMode
          onHandleSubmit={() => {
            setMode('file');
          }}
          onCreate={onCreate}
          onBack={() => setMode('file')}
        />
      )}
    </div>
  );
}

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

function FileMode({
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

function LinkMode({
  onCreate,
  onHandleSubmit,
  onBack,
}: {
  onHandleSubmit?: () => void;
  onCreate: CreateCallback;
  onBack: () => void;
}) {
  const { getValues, resetField } = useFormContext<SourceFormValues>();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const url = getValues('link').trim();
    if (!url) {
      setError('Enter a valid URL.');
      return;
    }

    const entry: CreateKnowledgeSourcesInputType[number] = isYouTubeUrl(url)
      ? { sourceType: 'youtube', url }
      : { sourceType: 'url', url };
    const result = createKnowledgeSourcesSchema.safeParse([entry]);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Enter a valid URL.');
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

function TextMode({
  onCreate,
  onBack,
  onHandleSubmit,
}: {
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

  const handleSubmit = async () => {
    clearErrors(['textTitle', 'textContent']);

    const entry: CreateKnowledgeSourcesInputType[number] = {
      sourceType: 'copied_text',
      textTitle: getValues('textTitle'),
      textContent: getValues('textContent'),
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

      const errorMessage = res?.[0]?.errorMessage;

      if (errorMessage) {
        setError(errorMessage);
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
