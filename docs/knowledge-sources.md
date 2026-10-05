# Knowledge Sources (NotebookLM-style ingestion)

> **Purpose:** Define how users add knowledge to a project — files, web links, YouTube
> transcripts, and copied text — and how Nexus turns each source into searchable,
> embeddable knowledge chunks.

---

# 1. Goal

Give a project a knowledge base the way NotebookLM does: instead of only typing
notes, the user adds **sources** (documents, links, video transcripts, pasted
text), and Nexus extracts clean text, chunks it, embeds it into pgvector, and
makes it available to the project's AI context and search.

Sources are **project-scoped**. Each source maps 1:1 to a row in the `knowledge_sources`
table; its chunks live in `knowledge_source_chunks`.

---

# 2. Source types

| Source type | What's needed                                    | Library / service                                                    |
| ----------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| PDF         | Text extraction                                  | `pdf-parse` (server) / `pdfjs-dist`                                  |
| DOCX        | Text extraction                                  | `mammoth`                                                            |
| XLSX/CSV    | Parse rows/sheets into structured text           | `xlsx` (SheetJS) — already in the stack                              |
| Images      | OCR or vision-model description                  | `tesseract.js` (OCR, free/local); vision model later                 |
| Web link    | Fetch + strip boilerplate to clean readable text | `@mozilla/readability` + `jsdom` (self-hosted); Jina Reader optional |
| YouTube     | Transcript, not the video                        | `youtube-transcript` (captions) > audio+Whisper fallback             |
| Audio file  | Speech-to-text                                   | OpenAI Whisper API / `whisper.cpp` — **deferred**                    |
| Video file  | Extract audio track, then transcribe             | `ffmpeg` → Whisper — **deferred**                                    |
| Copied text | None — direct store                              | —                                                                    |

> **Sequencing:** Ship **files + links + YouTube + copied text** first. Audio/video
> transcription (ffmpeg + Whisper) is the most expensive and infra-heavy piece and
> is **deferred** to a later pass. Reserve `audio`/`video` source types now.

---

# 3. Pipeline architecture

Reuses the existing BullMQ + Redis + pgvector infra almost exactly.

```
POST /api/v1/knowledge/:projectId/sources
        │
        ├── (files) create presigned PUT → client uploads → confirm
        └── else create the source row immediately
        │
        ▼
   Insert source(s) into `knowledge_sources` (status = pending)
   Enqueue BullMQ job `knowledge-process` (jobId = `ingest-${sourceId}`)
        │
        ▼
   Worker (ingest-${sourceId})
        1. Extract raw content (dispatch by sourceType)
        2. Chunk text (~500–1000 token, ~10% overlap)
        3. Embed each chunk (OpenAI text-embedding-3-small, 1536 dims)
        4. Store rows in `knowledge_source_chunks` (with pgvector embedding)
        5. Set the source status → ready | failed
        6. Publish status via Redis pub/sub channel `knowledge:${projectId}`
        │
        ▼
   Frontend receives status via SSE (GET .../sources/events)
```

### Dedup / idempotency

`jobId` is keyed on the source (`ingest-${sourceId}`). Re-uploading a file or
re-submitting a link reuses the source row and re-enqueues with the same jobId,
so the worker does not double-process.

---

# 4. Chunking

- Target ~500–1000 **tokens** per chunk (not strict; ~800 is the default).
- Keep ~10% overlap between consecutive chunks to preserve context boundaries.
- Store `chunkIndex` and page/heading metadata (where available) on the chunk.

---

# 5. Embeddings

- Provider: OpenAI `text-embedding-3-small` → **1536-dim** vectors (matches the
  `knowledge_source_chunks.embedding` column).
- Env: `OPENAI_API_KEY`, `AI_EMBEDDING_MODEL=text-embedding-3-small`.
- Embeddings are generated in the worker after chunking; a failure there marks the
  source `failed`. (The provider call lives behind a small `ai/embeddings.ts`
  abstraction so it can be swapped later.)

---

# 6. Status & realtime

- `knowledge_sources.status`: `pending` → `processing` → `ready` | `failed`.
- The worker publishes progress to Redis channel `knowledge:${projectId}`.
- `GET /api/v1/knowledge/:projectId/sources/events` streams those events over SSE
  (`text/event-stream`), matching the realtime guidance in `backend-architecture.md`.

---

# 7. Endpoints (target)

| Method | Path                                              | Purpose                               |
| ------ | ------------------------------------------------- | ------------------------------------- |
| POST   | `/api/v1/knowledge/:projectId/sources`            | Create source(s), enqueue ingestion   |
| POST   | `/api/v1/knowledge/:projectId/sources/upload-url` | Get a presigned PUT for a file source |
| GET    | `/api/v1/knowledge/:projectId/sources`            | List sources + status                 |
| GET    | `/api/v1/knowledge/:projectId/sources/events`     | SSE stream of ingestion progress      |

> The endpoint surface is the goal. The existing `knowledge` routes are stubs; the
> `knowledge_sources`/`knowledge_source_chunks` tables are the reference model.

---

# 8. Frontend (onboarding step 3 + Knowledge page)

NotebookLM-style **"Add sources"** step replacing the current onboarding
"Set up your milestones" content:

- Dropzone / "Upload files" (PDF, DOCX, XLSX, CSV, images, TXT/MD).
- "Websites / YouTube" — paste a URL (detects YouTube for captions).
- "Copied text" — paste text directly.
- Source list with status badges (`pending`/`processing`/`ready`/`failed`) and
  per-source processing progress via SSE.
