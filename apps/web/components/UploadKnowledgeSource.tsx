'use client';

import { useState } from 'react';
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
import { isYouTubeUrl, normalizeUrl } from '@nexus/shared-helpers';
import type {
  CreateKnowledgeSourcesInputType,
  KnowledgeSourceListType,
  SuccessResponse,
} from '@nexus/types';
import { useCreateKnowledgeSources, useGetKnowledgeSources } from '@/hooks/useKnowledge';
import { useParams } from 'next/navigation';
import { FileMode } from './knowledge/FileMode';
import { LinkMode } from './knowledge/LinkMode';
import { TextMode } from './knowledge/TextMode';

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

export type CreateCallback = (
  entries: CreateKnowledgeSourcesInputType,
) => Promise<SuccessResponse<KnowledgeSourceListType>>;

export const MAX_LINKS_PER_ADD = 10;
export const MAX_DETECTED_LINKS = 8;

export const toLinkEntry = (url: string): CreateKnowledgeSourcesInputType[number] =>
  isYouTubeUrl(url) ? { sourceType: 'youtube', url } : { sourceType: 'url', url };

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

export function UploadKnowledgeSource({
  projectId: projectIdProp,
  selectable,
}: {
  projectId?: string;
  selectable?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('file');

  // Explicit prop wins; fall back to the route param (project page).
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? paramProjectId ?? '';

  const { mutateAsync: createKnowledgeSources } = useCreateKnowledgeSources(projectId);

  const { data: knowledgeSources } = useGetKnowledgeSources({ variables: projectId });

  const onCreate: CreateCallback = (entries) => {
    if (!projectId) throw new Error('Project not ready yet.');
    return createKnowledgeSources(entries);
  };

  // Normalized so a link pasted again still counts as added: a #fragment and trailing
  // punctuation are stripped, e.g. 'https://example.com/page#x' and 'https://example.com/page.'
  // both collapse to 'https://example.com/page'.
  const existingUrls = new Set(
    (knowledgeSources ?? []).flatMap((source) => {
      if ((source.sourceType !== 'url' && source.sourceType !== 'youtube') || !source.sourceRef) {
        return [];
      }
      const url = normalizeUrl({ url: source.sourceRef });
      return url ? [url] : [];
    }),
  );

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
          selectable={selectable}
        />
      )}
      {mode === 'link' && (
        <LinkMode
          existingUrls={existingUrls}
          onHandleSubmit={() => {
            setMode('file');
          }}
          onCreate={onCreate}
          onBack={() => setMode('file')}
        />
      )}
      {mode === 'text' && (
        <TextMode
          existingUrls={existingUrls}
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
