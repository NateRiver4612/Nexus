'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import {
  isAudioMime,
  isDocxMime,
  isImageMime,
  isPdfMime,
  isSpreadsheetMime,
  isTextPreviewMime,
  isVideoMime,
} from '@/lib/utils';

import { HighlightedCode } from './HighlightedCode';
import { Markdown } from './Markdown';
import { MermaidDiagram } from './MermaidDiagram';
import { AudioPlayer } from './preview/AudioPlayer';
import { DocxPreview } from './preview/DocxPreview';
import { SpreadsheetPreview } from './preview/SpreadsheetPreview';

// pdf.js touches browser-only globals, so it must never run during server rendering.
const PdfPreview = dynamic(
  () => import('./preview/PdfPreview').then((module) => module.PdfPreview),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> },
);

export type FilePreviewProps = {
  name: string;
  mimeType: string;
  /** Decoded text for text-like files. */
  text?: string | null;
  /** Object URL for media renderers. */
  objectUrl?: string | null;
  /** Raw bytes for renderers that parse the file themselves. */
  buffer?: ArrayBuffer | null;
  isLoading?: boolean;
  error?: string | null;
};

// Picks one renderer from the preview state. text → mermaid/markdown/code; objectUrl →
// image/audio/video/pdf; buffer → docx/xlsx. isLoading/error short-circuit first.
//
// Example — raw docx in, buffer renderer out (converted docs arrive as a pdf objectUrl instead):
//   input:  { name: 'report.docx', mimeType: '…wordprocessingml.document', buffer: <bytes>, objectUrl: null }
//   output: <DocxPreview buffer={bytes} />
export const FilePreview = ({
  name,
  mimeType,
  text,
  objectUrl,
  buffer,
  isLoading,
  error,
}: FilePreviewProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (isTextPreviewMime(mimeType) && text !== null && text !== undefined) {
    // Generic text/* hides these; also match by extension.
    const isMermaid = mimeType === 'text/vnd.mermaid' || /\.(mmd|mermaid)$/i.test(name);
    if (isMermaid) return <MermaidDiagram source={text} />;

    const isMarkdown = mimeType === 'text/markdown' || /\.(md|markdown)$/i.test(name);
    if (isMarkdown) return <Markdown>{text}</Markdown>;

    return <HighlightedCode code={text} filename={name} />;
  }

  if (objectUrl) {
    if (isImageMime(mimeType)) {
      return (
        // Blob URLs are ours, so a plain img is safe and avoids next/image sizing rules.
        <img
          src={objectUrl}
          alt={name}
          className="mx-auto max-h-[70vh] rounded-lg object-contain"
        />
      );
    }

    if (isAudioMime(mimeType)) return <AudioPlayer src={objectUrl} />;

    if (isVideoMime(mimeType)) {
      return <video controls src={objectUrl} className="max-h-[70vh] w-full rounded-lg" />;
    }

    if (isPdfMime(mimeType)) return <PdfPreview src={objectUrl} />;
  }

  // Formats that parse their own bytes (docx/xlsx) never become an object URL.
  if (buffer) {
    if (isDocxMime(mimeType)) return <DocxPreview buffer={buffer} />;
    if (isSpreadsheetMime(mimeType)) return <SpreadsheetPreview buffer={buffer} />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      No preview is available for this file type. You can still download it.
    </p>
  );
};
