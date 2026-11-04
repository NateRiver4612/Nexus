export type ResearchErrorKind =
  | 'config' // missing or invalid API key, retrying cannot help
  | 'rate_limited' // slow down and retry
  | 'quota_exceeded' // plan or pay-as-you-go limit hit, retrying cannot help
  | 'bad_request' // our request was invalid, retrying cannot help
  | 'not_found' // unknown request id, retrying cannot help
  | 'unavailable'; // network failure, timeout, 5xx, or unexpected response, worth retrying

type ErrorRule = { kind: ResearchErrorKind; pattern: RegExp };

const START_RULES: ErrorRule[] = [
  { kind: 'config', pattern: /missing or invalid api key|unauthorized|^401 error/ },
  { kind: 'rate_limited', pattern: /excessive requests|^429 error/ },
  { kind: 'quota_exceeded', pattern: /usage limit|pay-as-you-go limit|^43[23] error/ },
  { kind: 'bad_request', pattern: /^400 error/ },
  { kind: 'unavailable', pattern: /internal server error|^500 error|timed out/ },
];

const POLL_RULES: ErrorRule[] = [
  { kind: 'config', pattern: /missing or invalid api key|unauthorized|^401 error/ },
  { kind: 'not_found', pattern: /^404 error|research task not found/ },
  { kind: 'unavailable', pattern: /internal server error|^500 error|timed out/ },
];

const RULES = { start: START_RULES, poll: POLL_RULES } as const;

export class ResearchProviderError extends Error {
  readonly kind: ResearchErrorKind;

  constructor({ message, kind }: { message: string; kind: ResearchErrorKind }) {
    super(message);
    this.name = 'ResearchProviderError';
    this.kind = kind;
  }
}

export function toResearchError({
  error,
  operation,
}: {
  error: unknown;
  operation: 'start' | 'poll';
}) {
  if (error instanceof ResearchProviderError) return error;

  const raw = error instanceof Error ? error.message : String(error);
  const message = `Tavily research ${operation} failed: ${raw}`;
  const text = raw.toLowerCase();

  const rule = RULES[operation].find(({ pattern }) => pattern.test(text));
  if (rule) return new ResearchProviderError({ kind: rule.kind, message });

  // Anything undocumented for this endpoint (a network failure, a gateway error, a reworded
  // message) is treated as retryable and logged, which is the safe direction to fail in.
  console.warn(`[tavily] unclassified research ${operation} error, treating as retryable: ${raw}`);
  return new ResearchProviderError({ kind: 'unavailable', message });
}
