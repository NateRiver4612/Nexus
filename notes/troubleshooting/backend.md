# Backend

## Knowledge ingestion → chunking

### Symptom

A source with no ASCII sentence punctuation (a Bengali-style transcript, or one long
whitespace-free blob) came back as a single oversized chunk instead of several — the input
could exceed the embedding model's cap.

### Root cause

`chunkText` only split paragraphs into sentences on `.!?`. Sentence punctuation is
language-specific, so non-Latin transcripts (words spaced, no ASCII `.`) and punctuation-free
runs returned from `sentenceSplit` as one giant "sentence" — no sentence boundary could bring
it under `targetChars`.

### Fix

After `sentenceSplit`, anything still over the cap goes through `hardSplit`: cut at the last
whitespace in the second half of the window, otherwise a hard cut at `maxChars`. The overlap
tail is still prepended to the next chunk.

### Verify

`bun test src/modules/knowledge/__tests__/chunk.test.ts` — unpunctuated non-Latin text, a
single whitespace-free run, overlap between chunks, and empty input returning `[]`.

## Knowledge ingestion → YouTube transcripts

### Symptom

Some videos failed ingestion with a generic transcript error, and retries kept failing.

### Root cause & fix

`YoutubeTranscript.fetchTranscript` was called with no language, so it depended on defaults and
failed ambiguously. It now requests English explicitly (`lang: 'en'`), and
`YoutubeTranscriptNotAvailableLanguageError` maps to "No English transcript is available for
this video."

### Tradeoff

A missing language can't be fixed by retrying, so it's classified unrecoverable via
`withUnrecoverable`; `YoutubeTranscriptTooManyRequestsError` stays retryable so rate limits
recover on backoff.
