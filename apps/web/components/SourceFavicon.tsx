'use client';

import { Globe } from 'lucide-react';
import { useState } from 'react';

export const SourceFavicon = ({ favicon }: { favicon?: string | null }) => {
  const [failed, setFailed] = useState(false);

  if (!favicon || failed) {
    return <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  }

  return (
    <img
      src={favicon}
      alt=""
      loading="lazy"
      width={16}
      height={16}
      onError={() => setFailed(true)}
      className="size-4 shrink-0 rounded-sm object-contain"
    />
  );
};
