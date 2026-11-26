'use client';

import { faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { youtubeThumbnailUrl } from '@nexus/shared-helpers';

import { cn } from '@/lib/utils';

import { MediaThumbnail } from './MediaThumbnail';

type YouTubeBookmarkProps = {
  url: string;
  title: string;
  className?: string;
  thumbnailClassName?: string;
};

/** Bookmark-style preview for a YouTube link: 16:9 video thumbnail + title. */
export const YouTubeBookmark = ({
  url,
  title,
  className,
  thumbnailClassName,
}: YouTubeBookmarkProps) => {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <MediaThumbnail
        src={youtubeThumbnailUrl({ url })}
        alt={title}
        className={cn('h-14 w-24 rounded-md bg-muted', thumbnailClassName)}
        fallback={<FontAwesomeIcon icon={faYoutube} color="red" size="xl" />}
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">YouTube</p>
      </div>
    </div>
  );
};
