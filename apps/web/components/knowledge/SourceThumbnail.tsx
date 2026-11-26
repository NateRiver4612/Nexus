'use client';

import { faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { isThumbnailableMime, siteFaviconUrl, youtubeThumbnailUrl } from '@nexus/shared-helpers';
import type { KnowledgeSourceType } from '@nexus/types';
import { Globe } from 'lucide-react';

import { MediaThumbnail } from '@/components/MediaThumbnail';
import { useThumbnailUrl } from '@/hooks/useThumbnailUrl';
import { cn } from '@/lib/utils';
import { fileIcon } from '../UploadKnowledgeSource';

/** Thumbnail for a knowledge row: YouTube video still, server thumbnail, or a file-type icon. */
export const SourceThumbnail = ({ source }: { source: KnowledgeSourceType }) => {
  const isYouTube = source.sourceType === 'youtube';
  const isUrl = source.sourceType === 'url';
  const canHaveThumbnail = Boolean(source.storageKey) && isThumbnailableMime(source.mimeType);

  const thumbnail = useThumbnailUrl({
    source: canHaveThumbnail
      ? { kind: 'knowledge', projectId: source.projectId, sourceId: source.id }
      : null,
    enabled: canHaveThumbnail,
  });

  if (isYouTube) {
    return (
      <MediaThumbnail
        src={youtubeThumbnailUrl({ url: source.sourceRef })}
        alt={source.name}
        className="h-14 w-24 rounded-md bg-muted"
        fallback={<FontAwesomeIcon icon={faYoutube} color="red" size="xl" />}
      />
    );
  }

  if (isUrl) {
    return (
      <MediaThumbnail
        src={siteFaviconUrl({ url: source.sourceRef })}
        alt={source.name}
        className="size-14 2xl:size-16 rounded bg-muted"
        fallback={<Globe className="size-5 text-muted-foreground" aria-hidden />}
      />
    );
  }

  const { icon, color } = fileIcon({
    name: source.name,
    type: source.mimeType ?? source.sourceType,
  });

  return (
    <MediaThumbnail
      src={thumbnail.data?.url}
      alt={source.name}
      isLoading={thumbnail.status === 'loading'}
      className={cn('size-14 2xl:size-16 rounded', color)}
      fallback={<FontAwesomeIcon icon={icon} color={color} size="xl" />}
    />
  );
};
