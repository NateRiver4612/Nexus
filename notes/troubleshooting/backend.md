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

## Thumbnails → spreadsheets

### Symptom

Spreadsheet thumbnails (XLSX/CSV) came back as a failure icon — or never appeared — even for
valid files, and it was worse on wide sheets with many columns.

### Root cause

Office thumbnails went `file → Gotenberg (LibreOffice) → PDF → page 1 via pdf-to-img → WebP`.
LibreOffice's PDF export of some wide spreadsheets yields content that `pdf-to-img` (PDF.js on a
canvas) rejects — the "clip without a `Path2D`" case — so the render threw and failed the whole
thumbnail. Even when it worked, page 1 was a bad preview: wide sheets split and clip across
pages, so the result wasn't recognizable at thumbnail size.

### Fix

Route spreadsheet MIME types to `spreadsheetToWebp` *before* the generic office branch. It parses
the first sheet with the same `xlsx` library the web preview uses and draws a small 8×5 grid card
(SVG → WebP), skipping the PDF→canvas step entirely. A corrupt workbook logs and falls back to the
generic card instead of failing. Word documents still go through Gotenberg → PDF → page 1.

### Tradeoff

Only the first sheet and a bounded slice (8 rows × 5 columns) are drawn, with cell text truncated —
enough to read as a spreadsheet at 480px, but not a faithful full-sheet render. It draws from cell
values only, so charts, cell colors, and formatting are lost.
