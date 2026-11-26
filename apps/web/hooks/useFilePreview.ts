'use client';

import { useEffect, useState } from 'react';

import { getAttachmentFile, getAttachmentPreview } from '@/api/attachments';
import { getArtifactFile, getArtifactPreview } from '@/api/artifacts';
import { getKnowledgeSourceFile, getKnowledgeSourcePreview } from '@/api/knowledge';
import { isDocxMime, isTextPreviewMime } from '@/lib/utils';

export type FilePreviewSource =
  | { kind: 'attachment'; conversationId: string; attachmentId: string }
  | { kind: 'artifact'; artifactId: string; version?: number }
  | { kind: 'knowledge'; projectId: string; sourceId: string };

export type FilePreviewState = {
  /** Blob URL for binary renderers; revoked when the source changes or the hook unmounts. */
  objectUrl: string | null;
  /** Decoded text for text-like files. */
  text: string | null;
  /** Raw bytes for renderers that parse the file themselves (DOCX, XLSX, PDF). */
  buffer: ArrayBuffer | null;
  /** MIME type to render with: `application/pdf` when a Word doc was converted. */
  mimeType: string;
  isLoading: boolean;
  error: string | null;
};

const IDLE: FilePreviewState = {
  objectUrl: null,
  text: null,
  buffer: null,
  mimeType: '',
  isLoading: false,
  error: null,
};

// Loads a file's bytes and returns whichever shape its renderer needs. Text-like files decode in
// the browser; everything else becomes an object URL. Bytes go through the authenticated API, so
// previews don't depend on S3 CORS or presigned-URL expiry. DOCX is fetched as a server-converted
// PDF; if that fails, raw bytes fall back to the DOCX renderer. Spreadsheets (even CSV) keep raw
// bytes for the grid renderer.
//
// Example — knowledge markdown in, decoded text out:
//   input:  { source: { kind: 'knowledge', projectId: 'p1', sourceId: 's1' }, mimeType: 'text/markdown' }
//   output: { objectUrl: null, text: '# Title…', buffer: null, mimeType: 'text/markdown', isLoading: false, error: null }
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
  const projectId = source?.kind === 'knowledge' ? source.projectId : null;
  const sourceId = source?.kind === 'knowledge' ? source.sourceId : null;
  const active = enabled && source !== null;

  useEffect(() => {
    if (!active) {
      setState(IDLE);
      return;
    }

    // A new source/mime restarts the load; ignore any in-flight result from the previous run.
    let cancelled = false;
    let objectUrl: string | null = null;

    setState({
      objectUrl: null,
      text: null,
      buffer: null,
      mimeType,
      isLoading: true,
      error: null,
    });

    const loadRaw = async (): Promise<ArrayBuffer> => {
      if (conversationId && attachmentId) {
        return getAttachmentFile(conversationId, attachmentId);
      }
      if (artifactId) {
        return getArtifactFile({ id: artifactId, version });
      }
      if (projectId && sourceId) {
        return getKnowledgeSourceFile(projectId, sourceId);
      }
      throw new Error('No file source.');
    };

    const loadConvertedPdf = async (): Promise<ArrayBuffer> => {
      if (conversationId && attachmentId) {
        return getAttachmentPreview(conversationId, attachmentId);
      }
      if (artifactId) {
        return getArtifactPreview({ id: artifactId, version });
      }
      if (projectId && sourceId) {
        return getKnowledgeSourcePreview(projectId, sourceId);
      }
      throw new Error('No file source.');
    };

    const load = async () => {
      try {
        let buffer: ArrayBuffer;
        let renderMimeType = mimeType;

        // Word renders faithfully as a server-converted PDF; if convert is down, raw bytes use DocxPreview.
        if (isDocxMime(mimeType)) {
          try {
            buffer = await loadConvertedPdf();
            renderMimeType = 'application/pdf';
          } catch {
            // Gotenberg may be down; fall back to the raw bytes and the DOCX renderer.
            buffer = await loadRaw();
          }
        } else {
          buffer = await loadRaw();
        }

        if (cancelled) return;

        // Text decodes to a string; everything else also gets a blob URL below for the renderer.
        if (isTextPreviewMime(renderMimeType)) {
          setState({
            objectUrl: null,
            text: new TextDecoder().decode(buffer),
            buffer: null,
            mimeType: renderMimeType,
            isLoading: false,
            error: null,
          });
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([buffer], { type: renderMimeType }));
        setState({
          objectUrl,
          text: null,
          buffer,
          mimeType: renderMimeType,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            objectUrl: null,
            text: null,
            buffer: null,
            mimeType,
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
  }, [active, conversationId, attachmentId, artifactId, version, projectId, sourceId, mimeType]);

  return state;
}
