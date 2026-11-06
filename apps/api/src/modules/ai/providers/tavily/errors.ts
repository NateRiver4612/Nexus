export type ResearchErrorKind =
  | 'config' // missing or invalid API key, retrying cannot help
  | 'rate_limited' // slow down and retry
  | 'quota_exceeded' // plan or pay-as-you-go limit hit, retrying cannot help
  | 'bad_request' // our request was invalid, retrying cannot help
  | 'not_found' // unknown request id, retrying cannot help
  | 'timeout' // ambiguous on submit (timeout, network drop, 5xx): may already exist, retrying could double-bill
  | 'unavailable'; // poll-phase network failure, 5xx, or unexpected response, worth retrying

type ErrorRule = { kind: ResearchErrorKind; pattern: RegExp };

const START_RULES: ErrorRule[] = [
  { kind: 'config', pattern: /missing or invalid api key|unauthorized|^401 error/ },
  { kind: 'rate_limited', pattern: /excessive requests|^429 error/ },
  { kind: 'quota_exceeded', pattern: /usage limit|pay-as-you-go limit|^43[23] error/ },
  { kind: 'bad_request', pattern: /^400 error/ },
  // Any other start failure is ambiguous: the task may already exist, so retrying could
  // create and bill a second one. Only rate limits are safely retryable on submit.
  { kind: 'timeout', pattern: /timed out|internal server error|^500 error/ },
];

const POLL_RULES: ErrorRule[] = [
  { kind: 'config', pattern: /missing or invalid api key|unauthorized|^401 error/ },
  { kind: 'not_found', pattern: /^404 error|research task not found/ },
  { kind: 'unavailable', pattern: /internal server error|^500 error|timed out/ },
];

// Search is a read-only call, so unlike `start` an ambiguous failure is safe to retry:
// the worst case is one extra credit, never a duplicated long-running task.
const SEARCH_RULES: ErrorRule[] = [
  { kind: 'config', pattern: /missing or invalid api key|unauthorized|^401 error/ },
  { kind: 'rate_limited', pattern: /excessive requests|^429 error/ },
  { kind: 'quota_exceeded', pattern: /usage limit|pay-as-you-go limit|^43[23] error/ },
  { kind: 'bad_request', pattern: /^400 error/ },
  { kind: 'unavailable', pattern: /internal server error|^5\d\d error|timed out|fetch failed/ },
];

const RULES = { start: START_RULES, poll: POLL_RULES, search: SEARCH_RULES } as const;

export class ResearchProviderError extends Error {
  readonly kind: ResearchErrorKind;

  constructor({ message, kind }: { message: string; kind: ResearchErrorKind }) {
    super(message);
    this.name = 'ResearchProviderError';
    this.kind = kind;
  }
}

const TRANSIENT_KINDS = new Set<ResearchErrorKind>(['unavailable', 'rate_limited']);

/** Transient Tavily failures worth another attempt. Search is read-only, so retrying is safe. */
export const isRetryableTavilyError = ({ error }: { error: unknown }) =>
  error instanceof ResearchProviderError && TRANSIENT_KINDS.has(error.kind);

export function toResearchError({
  error,
  operation,
}: {
  error: unknown;
  operation: 'start' | 'poll' | 'search';
}) {
  if (error instanceof ResearchProviderError) return error;

  const raw = error instanceof Error ? error.message : String(error);
  const scope = operation === 'search' ? 'search' : `research ${operation}`;
  const message = `Tavily ${scope} failed: ${raw}`;
  const text = raw.toLowerCase();

  const rule = RULES[operation].find(({ pattern }) => pattern.test(text));
  if (rule) return new ResearchProviderError({ kind: rule.kind, message });

  // On start the task may already exist, so an unknown failure is treated as ambiguous and
  // not retried. Poll and search never re-submit, so those are safe to retry.
  const kind = operation === 'start' ? 'timeout' : 'unavailable';
  console.warn(`[tavily] unclassified ${scope} error (kind: ${kind}): ${raw}`);
  return new ResearchProviderError({ kind, message });
}
