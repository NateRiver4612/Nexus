---
name: knowledge-ingestion
description: Use when working on the knowledge module, knowledge source ingestion, chunking, embeddings, or the knowledge_sources/knowledge_source_chunks tables.
---

Knowledge source ingestion follows a NotebookLM-style pipeline. Full detail in `docs/knowledge-sources.md` — this is the quick-reference version.

## Pipeline

`POST /api/v1/knowledge/:projectId/sources` → insert source row(s) (status `pending`) → enqueue BullMQ job `knowledge-process` (`jobId = ingest-${sourceId}`) → worker: extract (dispatched by `sourceType`) → chunk (~500-1000 tokens, ~10% overlap) → embed (OpenAI `text-embedding-3-small`, 1536 dims, behind the `ai/embeddings.ts` abstraction so the provider can be swapped) → store in `knowledge_source_chunks` → mark `ready`/`failed` → publish status to Redis pub/sub (`knowledge:${projectId}`) → SSE to client.

## Source types

`file` — PDF (`pdf-parse`), DOCX (`mammoth`), XLSX/CSV (`xlsx`/SheetJS — parse rows/sheets into structured text), images (`tesseract.js` OCR). `url` (readability + jsdom). `youtube` (`youtube-transcript` captions, audio+Whisper fallback). `copied_text` (direct store, no extraction). `audio`/`video` are reserved in the enum but deferred (ffmpeg + Whisper, later pass) — don't implement extraction for these without checking in first.

## Request shape

The create-sources payload is a `sourceType`-discriminated union (`file` / `url` / `youtube` / `copied_text`) — there is no `kind`/`linkType` grouping layer. The API shape is 1:1 with the DB enum; don't introduce an intermediate grouping abstraction.

## Dedup

`jobId` is keyed on the source id (`ingest-${sourceId}`) so a re-upload/re-submit of the same source reuses the row and re-enqueues under the same jobId — the worker doesn't double-process. BullMQ's `jobId` uniqueness handles this; no separate dedup check needed in the service layer.

## Endpoints (target shape)

- `POST /api/v1/knowledge/:projectId/sources` — create source(s), enqueue ingestion
- `POST /api/v1/knowledge/:projectId/sources/upload-url` — presigned PUT for a file source
- `GET /api/v1/knowledge/:projectId/sources` — list sources + status
- `GET /api/v1/knowledge/:projectId/sources/events` — SSE stream of ingestion progress

The existing `knowledge` routes in `apps/api` are stubs — this endpoint list and the `knowledge_sources`/`knowledge_source_chunks` tables are the reference model, not whatever's currently scaffolded.

## Frontend

Onboarding step 3 is the NotebookLM-style "Add sources" step (replaces the old "Set up your milestones" placeholder content): dropzone for files, a URL field that auto-detects YouTube, a copied-text paste area, and a source list with status badges (`pending`/`processing`/`ready`/`failed`) updated live via SSE.
