# System Design Concepts in Nexus

A human-facing map of the system-design ideas this project actually implements — where each one lives,
the code that backs it, and a plain-language example of the situation it handles.

Two audiences, two folders:

- `docs/` — the agent's reference model (architecture, schemas, product intent).
- `notes/` — human-facing explainers like this one and `troubleshooting.md`.

Scope: **implemented code only**. Scaffolded-but-unwired areas (cross-module search, notifications
logic, Redis caching/rate limiting, the pgvector *query* path) are deliberately left out.

Related docs: [`docs/system-design.md`](../docs/system-design.md),
[`docs/backend-architecture.md`](../docs/backend-architecture.md),
[`docs/ai-architecture.md`](../docs/ai-architecture.md),
[`docs/frontend-architecture.md`](../docs/frontend-architecture.md).

## Contents

**Architecture & contracts**
1. [Modular monolith with layered modules](#1-modular-monolith-with-layered-modules)
2. [Schema-first API contract + typed end-to-end RPC](#2-schema-first-api-contract--typed-end-to-end-rpc)
3. [Relational integrity and a normalized data model](#3-relational-integrity-and-a-normalized-data-model)

**Data & consistency**
4. [ACID transactions](#4-acid-transactions)
5. [Pessimistic locking (`SELECT … FOR UPDATE`)](#5-pessimistic-locking-select--for-update)
6. [Append-only versioning with immutable blob keys](#6-append-only-versioning-with-immutable-blob-keys)
7. [Idempotency and job deduplication](#7-idempotency-and-job-deduplication)

**Asynchronous processing**
8. [Queue-based asynchronous processing](#8-queue-based-asynchronous-processing)
9. [Worker concurrency and distributed job locks](#9-worker-concurrency-and-distributed-job-locks)
10. [Retry with backoff, jitter, and failure classification](#10-retry-with-backoff-jitter-and-failure-classification)
11. [Checkpointing and resumability](#11-checkpointing-and-resumability)
12. [Timeouts, deadlines, and cancellation](#12-timeouts-deadlines-and-cancellation)

**Storage, retrieval & AI context**
13. [Object storage offload with presigned URLs](#13-object-storage-offload-with-presigned-urls)
14. [Ingestion pipeline: chunking with overlap and embeddings](#14-ingestion-pipeline-chunking-with-overlap-and-embeddings)
15. [RAG context assembly with budgets](#15-rag-context-assembly-with-budgets)

**Realtime & resilience**
16. [Realtime updates: pub/sub, SSE, and polling fallback](#16-realtime-updates-pubsub-sse-and-polling-fallback)
17. [Resilience: graceful degradation, compensation, and error taxonomy](#17-resilience-graceful-degradation-compensation-and-error-taxonomy)

**Security, AI & frontend**
18. [Security and access control](#18-security-and-access-control)
19. [AI orchestration](#19-ai-orchestration)
20. [Frontend data layer](#20-frontend-data-layer)

---

## 1. Modular monolith with layered modules

**Concept** — One deployable API split into domain modules, each with a route layer (HTTP contract),
a service (business logic), and a repository (DB access). Dependencies are passed in explicitly through
factories, so services and repositories can run on a pooled client or a transaction.

**Where** — `apps/api/src/modules/*`, mounted centrally in `app.ts`; the pattern is documented in
`apps/api/AGENTS.md`.

**Maps to** — `docs/backend-architecture.md` §1 (Architecture Overview): "modular monolith", no
microservices.

**Example** — Adding "rename artifact" means a new route file that calls `ArtifactService(db).update()`,
which calls `ArtifactRepository.update()`. The route never imports `getDb()` logic or writes SQL, and the
same repository works inside a transaction by passing `tx` instead of `db`.

**Code**

```ts
// apps/api/src/app.ts
const v1 = new OpenAPIHono()
  .route('/ai', aiRoutes())
  .route('/projects', projectRoutes())
  .route('/artifacts', artifactRoutes());
```

*`apps/api/src/app.ts:55-59`*

```ts
// apps/api/src/modules/artifacts/repository.ts
export const ArtifactRepository = (db: Db) => ({
  insert(values: NewArtifact) {
    return db.insert(artifacts).values(values).returning();
  },
});
```

*`apps/api/src/modules/artifacts/repository.ts:11,39-41` — the service then does
`ArtifactRepository(tx)` inside a transaction (`service.ts:78-79`).*

**Why it matters** — Domain boundaries stay enforceable without network calls or distributed
transactions. The transaction-aware factory is what makes multi-write operations composable (see #4).

---

## 2. Schema-first API contract + typed end-to-end RPC

**Concept** — Request/response shapes are declared once as Zod/OpenAPI schemas at the route boundary.
The web app consumes the API through Hono's RPC client typed by `AppType`, so contract drift becomes a
compile error instead of a runtime surprise.

**Where** — Route files under `apps/api/src/modules/*/routes/`; shared schemas in
`packages/zod-schemas`; client in `apps/web/lib/client.ts`.

**Maps to** — `docs/backend-architecture.md` request architecture; `docs/system-design.md` functional
requirements (all user-facing operations run through this API).

**Example** — If a backend route stops returning `projectId`, the web call
`apiClient.api.v1.projects.$get()` fails typechecking. Request bodies are validated before the handler
runs, so services never receive arbitrary JSON.

**Code**

```ts
// apps/web/lib/client.ts
import type { AppType } from '@nexus/api/client';

export const apiClient = hc<AppType>(baseUrl, {
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});
```

*`apps/web/lib/client.ts:4-12`; `AppType` is defined in `apps/api/src/client.ts:1-3`.*

```ts
// apps/api/src/validation.ts
export async function parseBody<T>(body: unknown, schema: z.ZodSchema<T>) {
  const result = schema.safeParse(body);
  if (!result.success) throw ValidationError('Invalid request body', ...);
  return result.data;
}
```

*`apps/api/src/validation.ts:5-11`*

**Why it matters** — A single source of truth for I/O removes hand-written client types and makes the
type system the first line of defense at every boundary.

---

## 3. Relational integrity and a normalized data model

**Concept** — PostgreSQL is the source of truth. Foreign keys, cascades, enums, and indexes encode
domain invariants in the schema rather than relying on application discipline.

**Where** — `packages/db/src/schema/*` (Drizzle).

**Maps to** — `docs/database-schemas.md`; `docs/backend-architecture.md` core infrastructure (Postgres).

**Example** — Deleting a project cascades to its artifacts and artifact versions. There is no cleanup
code path that can forget a child row; the database guarantees no orphans.

**Code**

```ts
// packages/db/src/schema/artifacts.ts
projectId: uuid('project_id')
  .notNull()
  .references(() => projects.id, { onDelete: 'cascade' }),
// artifacts.id is a uuid PK; artifact_versions.artifact_id cascades the same way
```

*`packages/db/src/schema/artifacts.ts:44-46,68-70`*

**Why it matters** — Invariants that the database can enforce are cheaper and safer than repeated
application checks, especially across async workers.

---

## 4. ACID transactions

**Concept** — Multi-step writes that must all succeed or all fail run inside `db.transaction()`. This
keeps related tables consistent under failure and concurrency.

**Where** — Artifacts, tasks, milestones, and the AI worker.

**Maps to** — `docs/backend-architecture.md` synchronous request path; `docs/system-design.md`
functional requirements around planner/artifact integrity.

**Example** — Completing a task must also advance the project's `currentTaskId`. If the second write
fails, the task stays incomplete; the user never sees a half-applied state.

**Code**

```ts
// apps/api/src/modules/tasks/service.ts
await db.transaction(async (tx) => {
  const txRepository = TaskRepository(tx);
  await txRepository.completeTask(id);
  // ...find the next task, then:
  await txRepository.setCurrentTask(projectId, nextTaskId);
});
```

*`apps/api/src/modules/tasks/service.ts:38-85`; other examples: `artifacts/service.ts:78-99`,
`milestones/service.ts:30-40`, `ai/worker.ts:135-149`.*

**Why it matters** — The transaction boundary is where "one logical operation" becomes real. It is also
what lets the code use a single repository layer everywhere (#1).

---

## 5. Pessimistic locking (`SELECT … FOR UPDATE`)

**Concept** — When a value is computed from the current maximum (`latest version + 1`), concurrent writers
must be serialized. A row lock on the parent artifact makes the read-compute-write sequence safe; there
is no unique constraint on `(artifact_id, version)` to catch a collision.

**Where** — `apps/api/src/modules/artifacts/` (adding a new artifact version).

**Maps to** — Concurrency control in the artifact-editing flow from `docs/system-design.md`
("User can edit an artifact … manually or through an editor").

**Example** — Two saves for the same artifact overlap:

```
A: BEGIN, lock artifact, read max(version)=1
B: BEGIN, tries to lock artifact → waits
A: INSERT version 2, COMMIT, release lock
B: acquires lock, reads max(version)=2
B: INSERT version 3, COMMIT
```

Without the lock both read `1` and both insert version `2`, corrupting history.

**Code**

```ts
// apps/api/src/modules/artifacts/service.ts
const txRepository = ArtifactRepository(tx);
ensureExists(await txRepository.lockById(artifactId), NotFoundError('Artifact not found.'));
const next = (await txRepository.latestVersionNumber(artifactId)) + 1;
await txRepository.insertVersion({ id: versionId, artifactId, version: next, ... });
```

*`apps/api/src/modules/artifacts/service.ts:136-151`; the lock itself is
`SELECT … FOR UPDATE` in `repository.ts:25-37`.*

**Why it matters** — Concurrent edits need not be simultaneous to the millisecond: double-clicks, two
tabs, retries, and AI writes easily overlap. The lock makes the invariant "version numbers are unique and
monotonic" hold across all writers.

---

## 6. Append-only versioning with immutable blob keys

**Concept** — Edits create new versions; old versions are never overwritten. Each version's bytes live
under a unique storage key, so history and downloads stay reproducible.

**Where** — `apps/api/src/modules/artifacts/service.ts`, `artifact_versions` table.

**Maps to** — `docs/system-design.md`: "User can manage … the artifacts"; artifact detail/history view.

**Example** — Editing an artifact from v1 to v2 uploads to a new S3 key (`…/artifactId/versionId`) and
inserts a new `artifact_versions` row. Downloading v1 later still returns the original bytes.

**Code**

```ts
// apps/api/src/modules/artifacts/service.ts
function buildStorageKey({ projectId, artifactId, versionId }) {
  return `artifacts/${projectId}/${artifactId}/${versionId}`;
}
```

*`apps/api/src/modules/artifacts/service.ts:219-230`; version insert at `:143-151`.*

**Why it matters** — Immutable keys remove the need for overwrite semantics or copy-on-write logic, and
make cleanup a straightforward "delete every version key" operation.

---

## 7. Idempotency and job deduplication

**Concept** — Async jobs are keyed by a deterministic ID derived from the resource, so resubmitting the
same work replaces (or skips) the prior job instead of processing it twice.

**Where** — Knowledge ingestion, AI kickoff, research.

**Maps to** — `docs/backend-architecture.md` asynchronous operations (BullMQ).

**Example** — A user re-submits the same knowledge source. The producer removes the prior job and re-adds
it under `jobId: ingest-${source.id}`; two workers never ingest the same source in parallel.

**Code**

```ts
// apps/api/src/modules/knowledge/queues.ts
await queue.remove(jobId);
await queue.add(name, data, {
  removeOnComplete: true,
  removeOnFail: { count: 5000 },
  ...options,
  jobId,
});
```

*`apps/api/src/modules/knowledge/queues.ts:27-38`; same pattern in `ai/queues.ts:34-59` and
`research/queues.ts:34-61`.*

**Why it matters** — Retries and user impatience are both normal. A deterministic `jobId` turns "maybe
duplicate" into "at most one live job per resource".

---

## 8. Queue-based asynchronous processing

**Concept** — Expensive work (extraction, embeddings, LLM runs, research polling) is pushed to BullMQ and
handled by workers, keeping HTTP responses fast and failures retryable.

**Where** — `apps/api/src/startWorkers.ts`; knowledge, AI, and research workers.

**Maps to** — `docs/backend-architecture.md` §2 (Request Architecture): synchronous vs asynchronous
operations.

**Example** — Uploading a large PDF returns immediately with `pending`. The ingestion worker later
extracts text, chunks it, embeds the chunks, and flips the source to `ready`; the UI sees progress without
holding the request open.

**Code**

```ts
// apps/api/src/startWorkers.ts
const knowledgeWorker = KnowledgeWorker();
const aiWorker = AIWorker();
const researchWorker = ResearchWorker();
```

*`apps/api/src/startWorkers.ts:40-42`; the workers are collected in `globalForWorkers.nexusWorkers`
at `:47-52`. The singleton guard at `:21-29` avoids duplicate workers during dev hot reload.*

**Why it matters** — Decoupling request latency from work duration is the core reason the system stays
responsive while doing AI-scale processing.

---

## 9. Worker concurrency and distributed job locks

**Concept** — Each worker declares how many jobs it runs at once, and BullMQ holds a per-job lock for
`lockDuration`. A stalled worker's lock can be recovered, so jobs are neither lost nor double-run.

**Where** — `knowledge/worker.ts`, `research/worker.ts`, `ai/worker.ts`.

**Maps to** — `docs/backend-architecture.md` asynchronous processing (workers).

**Example** — Three knowledge sources arrive together; the worker processes three at a time. If a worker
crashes mid-ingestion, the lock expires and another worker resumes the job (see #11 for resume state).

**Code**

```ts
new Worker(KNOWLEDGE_QUEUE, handler, {
  connection: getRedis(),
  concurrency: 3,
});
```

*`apps/api/src/modules/knowledge/worker.ts:42`; `lockDuration` for long AI jobs:
`research/worker.ts:83` and `ai/worker.ts:159` (5 minutes).*

**Why it matters** — Concurrency is a throughput knob, while the lock is a correctness guarantee. Tuning
one without the other either starves the queue or duplicates work.

---

## 10. Retry with backoff, jitter, and failure classification

**Concept** — Transient failures are retried with exponential backoff plus jitter; permanent failures
fail fast so they don't burn retries. The classification is explicit, not a catch-all.

**Where** — BullMQ job options, the DeepSeek provider, the research loop, and `queue-errors.ts`.

**Maps to** — `docs/ai-architecture.md` provider reliability rules; `docs/backend-architecture.md`
worker retries.

**Example** — An embedding call returns `429`; the job retries after ~2s, then ~4s (plus jitter so parallel
jobs don't sync up). A `404` URL fails immediately and marks the source `failed` instead of retrying three
times.

**Code**

```ts
// apps/api/src/modules/ai/providers/deepseek/index.ts
await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt + Math.random() * 100, signal);
```

*`apps/api/src/modules/ai/providers/deepseek/index.ts:156-157`.*

```ts
// apps/api/src/queue-errors.ts
if (isUnrecoverable(error)) throw new UnrecoverableError(text);
throw error; // BullMQ retries the original error
```

*`apps/api/src/queue-errors.ts:18-38`; retryable-only predicate in `research/retry.ts:6-16`.*

**Why it matters** — Retrying a permanent error wastes budget and delays the user-visible failure; not
retrying a transient error makes the system look flaky. The explicit predicate is the contract.

---

## 11. Checkpointing and resumability

**Concept** — Long multi-stage jobs persist each completed stage. On retry they reuse finished work
instead of re-calling (and re-paying for) the model.

**Where** — Kickoff plan generation, research runs.

**Maps to** — `docs/ai-architecture.md` workflow principles (multi-stage AI workflows).

**Example** — Milestones generate successfully, then the summary call fails. On the BullMQ retry, the
checkpoint supplies the milestones, so only the summary is regenerated. Research rows do the same with a
saved `requestId`: a restart re-polls the existing paid request instead of submitting a new one.

**Code**

```ts
// apps/api/src/modules/kickoff/generate/index.ts
let milestones = checkpoint?.milestones;
if (!milestones) {
  milestones = (await generateMilestones(context)).milestones;
  await onMilestones?.(milestones, usage);
}
// ...
let summary = checkpoint?.milestones ? checkpoint.summary : undefined;
if (!summary) summary = (await generateSummary(context, milestones)).summary;
```

*`apps/api/src/modules/kickoff/generate/index.ts:85-106`; resume logic for research:
`research/stage.ts:147-189`.*

**Why it matters** — A failure late in a multi-call workflow should cost one call, not the whole run.
Checkpointing turns "retry" into "continue".

---

## 12. Timeouts, deadlines, and cancellation

**Concept** — Every long operation has a bound: a research deadline, a whole-run timeout, an SSE idle
timeout, and abort signals that propagate into provider calls and sleeps.

**Where** — Research stage, AI worker, DeepSeek provider, server bootstrap, web SSE reader.

**Maps to** — `docs/backend-architecture.md` request lifecycle; `docs/ai-architecture.md` cost/latency
controls.

**Example** — A user closes the chat tab mid-answer. The request's `AbortSignal` aborts the LLM stream and
the pending backoff sleep, so the system stops generating (and billing) immediately.

**Code**

```ts
// apps/api/src/modules/research/stage.ts
const RESEARCH_TIMEOUT_MS = 4 * 60 * 1000;
const deadline = startedAt.getTime() + RESEARCH_TIMEOUT_MS;
while (Date.now() < deadline) { /* poll */ }
```

*`apps/api/src/modules/research/stage.ts:25-33,324-327`. Abort-aware provider retry:
`deepseek/index.ts:112-130,246`; SSE idle timeout: `apps/api/src/index.ts:9-11`.*

**Why it matters** — Without deadlines, one stuck dependency can pin a worker forever. Cancellation also
stops work the user no longer wants.

---

## 13. Object storage offload with presigned URLs

**Concept** — File bytes live in S3/MinIO; PostgreSQL stores only metadata and keys. Clients upload and
download directly against short-lived presigned URLs, so the API never proxies large bodies.

**Where** — `apps/api/src/storage.ts`, knowledge upload/download routes, artifact content storage.

**Maps to** — `docs/backend-architecture.md` core infrastructure (S3/MinIO) and
`docs/system-design.md` knowledge/artifact management.

**Example** — The browser asks the API for an upload URL, then PUTs the file straight to S3. The API only
records `storageKey`, `mimeType`, and `size`, then enqueues ingestion. Download works the same way in
reverse.

**Code**

```ts
// apps/api/src/storage.ts
export async function presignKnowledgePutUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: s3Bucket(), Key: key, ContentType: contentType });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  return { url, key, bucket: s3Bucket() };
}
```

*`apps/api/src/storage.ts:53-63`; download variant with a sanitized filename at `:65-75`.*

**Why it matters** — Keeping bytes out of the API process avoids memory pressure and lets storage scale
independently. Presigned URLs keep credentials server-side.

---

## 14. Ingestion pipeline: chunking with overlap and embeddings

**Concept** — A document becomes retrieval-ready through a staged pipeline: extract → sanitize → chunk →
embed → persist. Chunks overlap so context isn't lost at boundaries, and the chunk replacement happens in
one transaction.

**Where** — `apps/api/src/modules/knowledge/` (`service.ts`, `chunk.ts`, `extract.ts`).

**Maps to** — `docs/knowledge-sources.md` (NotebookLM-style ingestion);
`docs/system-design.md` "User can add/delete their documents as AI will use it as knowledges".

**Example** — A PDF is extracted to text, null bytes are stripped, split into ~800-token chunks with ~10%
overlap, embedded when `OPENAI_API_KEY` is set, then all chunks for that source are replaced atomically.
If anything fails, the old chunks remain and the job retries.

**Code**

```ts
// apps/api/src/modules/knowledge/chunk.ts
if (current.length + sentence.length > targetChars && current.length > 0) {
  chunks.push(current.trim());
  current = current.slice(-overlapChars) + '\n'; // carry context into the next chunk
}
current += sentence + '\n';
```

*`apps/api/src/modules/knowledge/chunk.ts:33-43`; the atomic replace + status flip:
`knowledge/service.ts:181-197`.*

**Why it matters** — Chunking quality directly bounds retrieval quality. Overlap and atomic replacement
prevent "lost context" and "mixed old/new chunks" failure modes.

---

## 15. RAG context assembly with budgets

**Concept** — The model is given a small, always-on project context, and anything deeper is fetched by
tools. Every injected string is truncated to a budget so a single verbose field can't crowd out the rest.

**Where** — `apps/api/src/modules/ai/chat/contextBuilder.ts`, tool results in `runChatLoop.ts`.

**Maps to** — `docs/ai-architecture.md` context/prompt principles; `docs/system-design.md` AI assistant.

**Example** — A chat turn gets project name, progress, current task, and up to 10 milestones, each
truncated (description 500 chars, titles 80). Deeper knowledge is pulled by a tool rather than stuffed
into the prompt up front.

**Code**

```ts
// apps/api/src/modules/ai/chat/contextBuilder.ts
export const truncate = ({ text, max }: { text: string; max: number }) =>
  text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;

lines.push(`Progress: ${project.progressPercentage}% (...)`);
// milestones.slice(0, MAX_MILESTONES) ...
```

*`apps/api/src/modules/ai/chat/contextBuilder.ts:6-11,22-62`; tool results capped at 6000 chars in
`runChatLoop.ts:16,217-220`.*

**Why it matters** — Context is a finite budget. Bounded assembly keeps prompts predictable in cost and
leaves room for the actual question.

---

## 16. Realtime updates: pub/sub, SSE, and polling fallback

**Concept** — Workers publish status changes to a Redis channel; an SSE route subscribes and forwards
them to the browser. Where SSE isn't needed, TanStack Query polls while work is in flight.

**Where** — Knowledge ingestion status → `knowledge:${projectId}` channel → SSE route; client polling in
`useKnowledge`.

**Maps to** — `docs/system-design.md` "User can manage AI knowledges, view/add/delete and search";
`docs/frontend-architecture.md` data fetching.

**Example** — A worker moves a source from `processing` to `ready`. The SSE stream pushes
`event: source` and the UI updates immediately. If the stream drops, the list hook polls every 3s while
any source is `pending`/`processing`, then stops.

**Code**

```ts
// apps/api/src/modules/knowledge/routes/index.ts
return streamSSE(c, async (stream) => {
  const subscriber = getRedis().duplicate();
  await subscriber.subscribe(channel);
  subscriber.on('message', (_c, message) => {
    void stream.writeSSE({ event: 'source', data: message });
  });
  await new Promise<void>((resolve) => stream.onAbort(resolve));
});
```

*`apps/api/src/modules/knowledge/routes/index.ts:23-47`; publisher in `knowledge/helpers.ts:49-66`;
client parser in `apps/web/lib/Sse.ts:52-124`; polling fallback in `useKnowledge.ts:32-43`.*

**Why it matters** — Push gives low latency; polling gives a simple, resilient baseline. Having both
means a dropped connection degrades UX instead of breaking it.

---

## 17. Resilience: graceful degradation, compensation, and error taxonomy

**Concept** — Optional dependencies degrade instead of failing the request; side effects that can't be
rolled back are cleaned up; non-critical writes are best-effort; errors share one taxonomy.

**Where** — Research (optional), embeddings (optional), artifact upload/insert ordering, checkpoint
writes, `errors.ts`.

**Maps to** — `docs/ai-architecture.md` failure handling; `docs/backend-architecture.md` error model.

**Example** — With no Tavily key, kickoff still generates a plan without research. If the DB insert fails
after an S3 upload, the object is deleted so there's no orphan. A failed checkpoint save is logged and the
run continues, because the next retry can regenerate it.

**Code**

```ts
// apps/api/src/modules/artifacts/service.ts
await putKnowledgeObject(storageKey, body, mimeType);

try {
  const artifact = await db.transaction(async (tx) => { /* insert artifact + version */ });
  return { artifact: toView(artifact), version: 1 };
} catch (error) {
  await discardObject(storageKey);
  throw error;
}
```

*`apps/api/src/modules/artifacts/service.ts:75-105`; best-effort cleanup at `:232-239`; degrading
research at `research/stage.ts:113-114`; error taxonomy in `apps/api/src/errors.ts:4-79`.*

**Why it matters** — Distributed steps can't be atomic. Deciding explicitly what is optional, what must
be compensated, and what is best-effort is what keeps partial failures from becoming corruption.

---

## 18. Security and access control

**Concept** — Authentication is session-based middleware; authorization is resource-level (workspace
membership), and unauthorized resources return `404` to avoid leaking existence. All external input is
validated at the boundary.

**Where** — `auth-middleware.ts`, per-module middlewares, route schemas, CORS, storage credentials.

**Maps to** — `docs/backend-architecture.md` and `docs/system-design.md` multi-user project model.

**Example** — A user who isn't a workspace member requests an artifact by ID. The access middleware loads
the artifact, resolves its project, checks membership, and returns `404 Artifact not found` — the same
response as a genuinely missing artifact.

**Code**

```ts
// apps/api/src/modules/artifacts/middlewares.ts
ensure(await ProjectsRepository(db).isWorkspaceMember(user.id, project.workspaceId),
  NotFoundError('Artifact not found.'));
```

*`apps/api/src/modules/artifacts/middlewares.ts:31-34`; auth middleware `auth-middleware.ts:13-29`;
CORS with credentials `app.ts:25-31`.*

**Why it matters** — Distinguishing "forbidden" from "not found" tells an attacker a resource exists.
Treating them the same closes that information leak while keeping the same UX.

---

## 19. AI orchestration

**Concept** — A provider abstraction hides vendor SDKs behind one interface; a bounded tool loop lets the
model call tools, validates arguments, and feeds failures back as tool results so the model can recover.
Usage is captured and persisted.

**Where** — `apps/api/src/modules/ai/` (`providers/`, `chat/runChatLoop.ts`, `types.ts`).

**Maps to** — `docs/ai-architecture.md` provider abstraction, tool use, and streaming principles.

**Example** — The model asks for `searchKnowledge` with `{ query: 42 }`. The call is rejected by the
schema, the validation message is returned as the tool result, and the model retries with a string. The
loop is capped at 8 iterations, with the final pass tool-free so the turn always ends in text.

**Code**

```ts
// apps/api/src/modules/ai/chat/runChatLoop.ts
const parsed = validTool.parameters.safeParse(call.args);
if (!parsed.success) {
  content = `Invalid arguments: ${z.prettifyError(parsed.error)}`;
  failed = true;
} else {
  const result = await runTool({ tool: validTool, ctx, args: parsed.data });
  content = result.content;
}
```

*`apps/api/src/modules/ai/chat/runChatLoop.ts:167-197`; iteration bound at `:14-15,87-89`; provider
instances in `ai/providers/index.ts:6-21`.*

**Why it matters** — Models are unreliable in specific, recoverable ways. Validating at the tool boundary
and returning errors as data keeps a bad call from crashing the turn, while the iteration cap bounds cost.
DSML recovery (concept 19's provider path) is a defensive fallback for a provider streaming defect, not a
supported format: structured `delta.tool_calls` wins, and `streamChat` logs when it has to recover.

---

## 20. Frontend data layer

**Concept** — Server state lives in TanStack Query, keyed by a deliberate hierarchy; mutations invalidate
the right keys, the cache is updated optimistically where it helps, and only the onboarding draft is
persisted to localStorage.

**Where** — `apps/web/hooks/`, `apps/web/lib/providers.tsx`.

**Maps to** — `docs/frontend-architecture.md` data fetching/state split.

**Example** — Deleting a knowledge source immediately removes it from the cached list, then invalidates
the query to reconcile with the server. The onboarding draft survives a refresh because only its query
key is dehydrated; project/artifact lists are not written to storage.

**Code**

```ts
// apps/web/hooks/createMutation.ts
onSuccess: composeCallbacks(defaults.onSuccess, props?.onSuccess),
```

*`apps/web/hooks/createMutation.ts:43-61` (default invalidation + caller callback both run).*

```ts
// apps/web/lib/providers.tsx
dehydrateOptions: { shouldDehydrateQuery }, // only onboardingKeys.draft
```

*`apps/web/lib/providers.tsx:9-13,48-55`; key hierarchy in `hooks/queryKeys.ts`; optimistic list filter in
`hooks/useKnowledge.ts:93-108`.*

**Why it matters** — A clear cache-key hierarchy makes invalidation precise and cheap. Persisting only
what must survive a reload avoids stale server data in localStorage.
