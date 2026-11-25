'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { Skeleton } from '@/components/ui/skeleton';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// The worker must be a real URL; webpack turns this into an asset emitted next to the app.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MAX_PAGES = 20;

type PdfPreviewProps = {
  src: string;
};

export const PdfPreview = ({ src }: PdfPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);

  // Pages render to a bitmap at a fixed width, so track the panel width to avoid overflow.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (error) {
    return (
      <p className="text-sm text-error">This PDF could not be previewed. Try downloading it.</p>
    );
  }

  const pageCount = Math.min(numPages, MAX_PAGES);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3">
      <Document
        file={src}
        onLoadError={() => setError(true)}
        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
        loading={
          <div className="w-full space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <Page
            key={index + 1}
            pageNumber={index + 1}
            width={width}
            className="mb-3 overflow-hidden rounded-lg border border-border shadow-sm"
          />
        ))}
      </Document>

      {numPages > MAX_PAGES && (
        <p className="text-xs text-muted-foreground">
          Showing the first {MAX_PAGES} of {numPages} pages.
        </p>
      )}
    </div>
  );
};
