/**
 * The allowlist that gates `read_url`.
 *
 * A chat model can be told (or tell itself) to fetch any URL, so `read_url` must not open the
 * whole internet: that would let a prompt-injected page pull attacker URLs, or the model phone
 * home to URLs it invented. The permitted set is built from only two trusted sources — what the
 * user actually wrote, and what `web_search` returned — and `read_url` refuses everything else.
 * `normalizeUrl` gives every URL one canonical form so membership is a plain string comparison.
 */
// Matches http(s) URLs in free text, stopping at the characters that end a URL in prose:
// whitespace, quotes, angle brackets, backticks, and closing brackets/parens.
const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]]+/gi;
// A URL at the end of a sentence carries a period or comma; without stripping it the trailing
// mark becomes part of the host/path and breaks both `new URL` parsing and allowlist membership.
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

/**
 * Every web URL written in `text`, normalized and de-duplicated. Used to seed the allowlist
 * from the user's own message; de-duping is what makes the allowlist a `Set` of one canonical
 * form per URL, so `read_url`'s `has()` check can't be dodged by a variant spelling.
 */
export function collectUrls({ text }: { text: string }): string[] {
  const found = (text.match(URL_PATTERN) ?? []).flatMap((raw) => {
    const url = normalizeUrl({ url: raw });
    return url ? [url] : [];
  });

  return [...new Set(found)];
}
