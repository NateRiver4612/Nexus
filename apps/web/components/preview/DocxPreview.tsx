'use client';

import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

type DocxPreviewProps = {
  buffer: ArrayBuffer;
};

export const DocxPreview = ({ buffer }: DocxPreviewProps) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(false);

    const convert = async () => {
      try {
        const [mammothModule, domPurifyModule] = await Promise.all([
          import('mammoth'),
          import('dompurify'),
        ]);
        const { value } = await mammothModule.default.convertToHtml({ arrayBuffer: buffer });
        if (cancelled) return;
        // Mammoth emits HTML derived from user files, so strip anything active before rendering.
        setHtml(domPurifyModule.default.sanitize(value));
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void convert();

    return () => {
      cancelled = true;
    };
  }, [buffer]);

  if (error) {
    return (
      <p className="text-sm text-error">
        This document could not be previewed. Try downloading it.
      </p>
    );
  }

  if (html === null) return <Skeleton className="h-96 w-full" />;

  return (
    <div
      className="text-sm leading-relaxed [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
