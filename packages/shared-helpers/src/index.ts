/** Derive a URL-safe slug from arbitrary input. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD') // split accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, '') // strip the diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * One canonical form for comparing URLs: http(s) only, no credentials, no #fragment, host
 * lowercased by the URL parser. Returns null for anything that isn't a plain web URL.
 */
export function normalizeUrl({ url }: { url: string }): string | null {
  try {
    const parsed = new URL(url.trim().replace(TRAILING_PUNCTUATION, ''));

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;

    parsed.hash = '';
    return parsed.href;
  } catch {
    return null;
  }
}

/** Every web URL written in `text`, normalized and de-duplicated, in order of appearance. */
export function collectUrls({ text }: { text: string }): string[] {
  const found = (text.match(URL_PATTERN) ?? []).flatMap((raw) => {
    const url = normalizeUrl({ url: raw });
    return url ? [url] : [];
  });

  return [...new Set(found)];
}

/**
 * True only for links the transcript importer can actually read: youtu.be/<id> or a youtube.com
 * watch link with a `v` parameter. A bare `v=` elsewhere (example.com/?v=2) is a normal page.
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '');

    if (host === 'youtu.be') return parsed.pathname.length > 1;
    if (host !== 'youtube.com') return false;
    return (
      parsed.searchParams.has('v') || /^\/(shorts|embed|live)\/[\w-]{11}/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/** Extract the 11-char video id from common YouTube URL shapes. */
export function youtubeVideoId({ url }: { url: string | null | undefined }): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

/** Formats we can render a server-side thumbnail for (Office/CSV go through Gotenberg). */
export const THUMBNAILABLE_OFFICE_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
]);

/** Text formats rendered as a document snippet. Mermaid stays an icon (not a rendered diagram). */
export const THUMBNAILABLE_TEXT_TYPES = new Set([
  'text/markdown',
  'text/plain',
  'application/json',
]);

export function isThumbnailableMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const mime = mimeType.toLowerCase();
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    THUMBNAILABLE_OFFICE_TYPES.has(mime) ||
    THUMBNAILABLE_TEXT_TYPES.has(mime)
  );
}

/** Public favicon service URL for a link preview. Client-side only; null for an invalid URL. */
export function siteFaviconUrl({
  url,
  size = 128,
}: {
  url: string | null | undefined;
  size?: number;
}): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.trim()).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}

/**
 * Thumbnail image URL for a YouTube video. The URL is deterministic from the video id, so
 * nothing needs to be stored — `mqdefault` exists for every video; `maxresdefault` may 404.
 */
export function youtubeThumbnailUrl({
  url,
  quality = 'mqdefault',
}: {
  url: string | null | undefined;
  quality?: 'mqdefault' | 'hqdefault' | 'maxresdefault';
}): string | null {
  const videoId = youtubeVideoId({ url });
  return videoId ? `https://i.ytimg.com/vi/${videoId}/${quality}.jpg` : null;
}
