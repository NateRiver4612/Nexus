'use client';

import { useEffect, useState } from 'react';

import { getAttachmentFile } from '@/api/attachments';
import { getArtifactFile } from '@/api/artifacts';
import { isTextLikeMime } from '@/lib/utils';

export type FilePreviewSource =
  | { kind: 'attachment'; conversationId: string; attachmentId: string }
  | { kind: 'artifact'; artifactId: string; version?: number };

export type FilePreviewState = {
  /** Blob URL for binary renderers; revoked when the source changes or the hook unmounts. */
  objectUrl: string | null;
  /** Decoded text for text-like files. */
  text: string | null;
  /** Raw bytes for renderers that parse the file themselves (DOCX, XLSX, PDF). */
  buffer: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
};

const IDLE: FilePreviewState = {
  objectUrl: null,
  text: null,
  buffer: null,
  isLoading: false,
  error: null,
};

/**
 * Loads one file's bytes for preview. Text-like files are decoded in the browser; everything
 * else becomes an object URL. Bytes come through the authenticated API, so previews don't
 * depend on S3 CORS or presigned-URL expiry.
 */
export function useFilePreview({
  source,
  mimeType,
  enabled = true,
}: {
  source: FilePreviewSource | null;
  mimeType: string;
  enabled?: boolean;
}): FilePreviewState {
  const [state, setState] = useState<FilePreviewState>(IDLE);

  const conversationId = source?.kind === 'attachment' ? source.conversationId : null;
  const attachmentId = source?.kind === 'attachment' ? source.attachmentId : null;
  const artifactId = source?.kind === 'artifact' ? source.artifactId : null;
  const version = source?.kind === 'artifact' ? (source.version ?? undefined) : undefined;
  const active = enabled && source !== null;

  useEffect(() => {
    if (!active) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setState({ objectUrl: null, text: null, buffer: null, isLoading: true, error: null });

    const load = async () => {
      try {
        let buffer: ArrayBuffer;
        if (conversationId && attachmentId) {
          buffer = await getAttachmentFile(conversationId, attachmentId);
        } else if (artifactId) {
          buffer = await getArtifactFile({ id: artifactId, version });
        } else {
          return;
        }

        if (cancelled) return;

        if (isTextLikeMime(mimeType)) {
          setState({
            objectUrl: null,
            text: new TextDecoder().decode(buffer),
            buffer: null,
            isLoading: false,
            error: null,
          });
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
        setState({ objectUrl, text: null, buffer, isLoading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            objectUrl: null,
            text: null,
            buffer: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Could not load this file.',
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [active, conversationId, attachmentId, artifactId, version, mimeType]);

  return state;
}
