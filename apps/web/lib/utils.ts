import { ACCEPTED_AUDIO_TYPES } from '@nexus/zod-schemas/constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD') // split accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, '') // strip the diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

export function totalEstimatedMinutes(tasks: { estimatedTimeMinutes?: number | null }[]): number {
  return tasks.reduce((sum, task) => sum + (task.estimatedTimeMinutes ?? 0), 0);
}

export function formatTimeMinutes(minutes?: number | null): string | null {
  if (!minutes) return null;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

/** Triggers a browser download for a text file. Client-only. */
export function downloadTextFile({
  filename,
  content,
  mimeType = 'text/plain',
}: {
  filename: string;
  content: string;
  mimeType?: string;
}) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Triggers a browser download for fetched binary bytes. Client-only. */
export function downloadBlob({ filename, blob }: { filename: string; blob: Blob }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const ARTIFACT_EXTENSION: Record<string, string> = {
  'text/markdown': '.md',
  'text/vnd.mermaid': '.mmd',
};

/** Keep the artifact's own name when it already has an extension; otherwise add one by mime type. */
export function artifactFilename(name: string, mimeType: string): string {
  if (/\.[a-z]{2,5}$/i.test(name)) return name;
  return `${name}${ARTIFACT_EXTENSION[mimeType] ?? '.txt'}`;
}

const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'mp4'];

/** Audio uploads use the same presigned PUT flow but a different `sourceType`. */
export function isAudioFile(file: File) {
  if (ACCEPTED_AUDIO_TYPES.includes(file.type)) return true;
  // Some browsers report an empty type for .m4a/.flac; fall back to the extension.
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.includes(ext) && !file.type.startsWith('video/');
}

/** MIME predicates used to pick a preview renderer. Keep them permissive — browsers vary. */
export function isTextLikeMime(mimeType: string) {
  const mime = mimeType.toLowerCase();
  return (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript'
  );
}

export function isImageMime(mimeType: string) {
  return mimeType.startsWith('image/');
}

export function isAudioMime(mimeType: string) {
  return mimeType.startsWith('audio/');
}

export function isVideoMime(mimeType: string) {
  return mimeType.startsWith('video/');
}

export function isPdfMime(mimeType: string) {
  return mimeType === 'application/pdf';
}

export function isDocxMime(mimeType: string) {
  return mimeType.includes('wordprocessingml.document');
}

export function isSpreadsheetMime(mimeType: string) {
  return (
    mimeType.includes('spreadsheetml.sheet') ||
    mimeType === 'text/csv' ||
    mimeType === 'application/csv' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
