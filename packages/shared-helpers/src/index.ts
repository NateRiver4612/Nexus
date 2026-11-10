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
    return host === 'youtube.com' && parsed.searchParams.has('v');
  } catch {
    return false;
  }
}
