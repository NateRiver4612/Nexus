'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type MediaThumbnailProps = {
  src?: string | null;
  alt: string;
  /** Shown when there's no URL yet or the image fails to load. */
  fallback: ReactNode;
  className?: string;
};

/** Small image preview with a built-in icon fallback, shared by sources, chat files, and artifacts. */
export const MediaThumbnail = ({ src, alt, fallback, className }: MediaThumbnailProps) => {
  const [failed, setFailed] = useState(false);

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
      ) : (
        fallback
      )}
    </div>
  );
};
