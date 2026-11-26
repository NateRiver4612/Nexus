'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type MediaThumbnailProps = {
  src?: string | null;
  alt: string;
  /** Shown when there's no URL (yet) or the image fails to load. */
  fallback: ReactNode;
  /** Shows a pulsing placeholder while the thumbnail is still being generated. */
  isLoading?: boolean;
  className?: string;
};

/** Small image preview with a built-in icon fallback, shared by sources, chat files, and artifacts. */
export const MediaThumbnail = ({
  src,
  alt,
  fallback,
  isLoading = false,
  className,
}: MediaThumbnailProps) => {
  const [failed, setFailed] = useState(false);

  // A new URL (e.g. the thumbnail finished generating) should get another load attempt.
  useEffect(() => setFailed(false), [src]);

  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : isLoading ? (
        <Skeleton className="size-full rounded-none" aria-hidden />
      ) : (
        fallback
      )}
    </div>
  );
};
