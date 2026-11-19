import type { ArtifactType } from '@nexus/types';

type ArtifactKind = ArtifactType['type'];

/**
 * Picks the artifact kind that best describes an uploaded chat file. The MIME type is
 * authoritative; the filename is only a fallback for browsers that send an empty type.
 */
export function artifactTypeForFile({
  mimeType,
  name,
}: {
  mimeType: string;
  name: string;
}): ArtifactKind {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessingml.document')) return 'document';
  if (mimeType.includes('spreadsheetml.sheet')) return 'spreadsheet';
  if (mimeType === 'text/csv' || mimeType === 'application/csv') return 'spreadsheet';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'text/markdown') return 'document';
  if (mimeType === 'application/json') return 'code';
  if (mimeType === 'text/plain') return 'document';

  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'md' || extension === 'markdown' || extension === 'txt') return 'document';
  if (extension === 'csv') return 'spreadsheet';
  if (extension === 'json') return 'code';

  return 'file';
}
