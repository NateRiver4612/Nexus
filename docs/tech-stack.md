# Overall Tech Stack

---

# 1. Stack Overview

```
                         NEXUS
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       FRONTEND                           BACKEND
          │                                 │
      Next.js                              Hono
      React                               Bun
      TypeScript                          TypeScript
          │                                 │
   ┌──────┼──────┐                 ┌────────┼────────┐
   │      │      │                 │        │        │
  UI    State   Data              API     Modules   Workers
   │      │      │                 │        │        │
Tailwind Zustand TanStack       REST     Modular   BullMQ
shadcn   Query    Query          API      Monolith
Tiptap

          │                                 │
          └────────────────┬────────────────┘
                           │
                    Data & Infrastructure
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      PostgreSQL         Redis          MinIO / S3
          │                │                │
       pgvector        Cache + Queue    Object Storage
                           │
                         BullMQ
                           │
                    Background Workers
                           │
                           ▼
                          AI
                    ┌──────┴──────┐
                    │             │
                 OpenAI       Anthropic
```

---

nexus/
│
├── apps/
│ ├── web/ # Next.js
│ │ ├── app/
│ │ │ ├── (auth)/
│ │ │ ├── (workspace)/
│ │ │ │ ├── projects/
│ │ │ │ ├── planner/
│ │ │ │ ├── artifacts/
│ │ │ │ ├── knowledge/
│ │ │ │ ├── notifications/
│ │ │ │ └── search/
│ │ │ │
│ │ │ └── projects/
│ │ │ └── [projectId]/
│ │ │ ├── overview/
│ │ │ ├── planner/
│ │ │ ├── artifacts/
│ │ │ ├── knowledge/
│ │ │ ├── activity/
│ │ │ └── settings/
│ │ │
│ │ └── features/
│ │
│ └── api/ # Hono modular monolith
│ └── src/
│
├── packages/
│ ├── db/
│ ├── ui/
│ ├── types/
│ └── config/
│
└── infrastructure/
├── docker/
└── ...

# 2. Frontend

| Technology          | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| **Next.js**         | Application framework, routing, Server Components |
| **React**           | UI                                                |
| **TypeScript**      | Type safety                                       |
| **Tailwind CSS**    | Styling                                           |
| **shadcn/ui**       | Reusable UI components                            |
| **Tiptap**          | Rich-text/document editing                        |
| **TanStack Query**  | Server state, caching, synchronization            |
| **Zustand**         | Client/global state                               |
| **React Hook Form** | Form management                                   |
| **Zod**             | Validation                                        |
| BetterAuth          | Authentication                                    |
| **SSE / WebSocket** | Realtime updates                                  |
| **Lucide**          | Icons                                             |

### Frontend Architecture

```
Next.js
   │
   ├── App Router
   │
   ├── React Server Components
   │
   ├── Feature Modules
   │   ├── Projects
   │   ├── Planner
   │   ├── Knowledge
   │   ├── Artifacts
   │   ├── Calendar
   │   ├── Notifications
   │   ├── Search
   │   └── AI
   │
   ├── Tiptap
   │
   ├── TanStack Query
   │
   └── Zustand
```

Tiptap is particularly important for Nexus because artifacts aren't just files to download.

Users should be able to:

```
Generate
   ↓
Preview
   ↓
Open
   ↓
Edit
   ↓
Save
   ↓
Create Version
```

---

# 3. Backend

Nexus uses:

> **Hono + Bun + TypeScript**

with a **modular monolith architecture**.

| Technology     | Purpose                   |
| -------------- | ------------------------- |
| **Hono**       | HTTP API                  |
| **Bun** | Runtime |
| **TypeScript** | Type safety               |
| **Drizzle** | ORM / database access |
| **Zod**        | Request validation        |
| **Better Auth** | Authentication |
| **BullMQ**     | Background job processing |

### Backend Architecture

```
                    Hono API
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Projects        Planner       Knowledge
        │              │              │
        ├──────────────┼──────────────┤
        │              │              │
    Artifacts       Calendar          AI
        │              │              │
        └──────────────┼──────────────┘
                       │
                Domain Services
                       │
              ┌────────┴────────┐
              ▼                 ▼
          PostgreSQL          Redis
                                │
                              BullMQ
                                │
                       ┌────────┼────────┐
                       ▼        ▼        ▼
                      AI     Artifact  Knowledge
                    Worker    Worker     Worker
```

The backend remains one application initially, but each domain has clear boundaries.

---

# 4. Core Backend Modules

```
backend/src/

├── modules/
│
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── projects/
│   ├── planner/
│   ├── knowledge/
│   ├── artifacts/
│   ├── calendar/
│   ├── notifications/
│   ├── search/
│   └── ai/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   ├── queue/
│   ├── storage/
│   └── ai/
│
└── shared/
```

The frontend and backend modules intentionally map closely:

```
Frontend                  Backend

Projects       ────────► Projects
Planner        ────────► Planner
Knowledge      ────────► Knowledge
Artifacts      ────────► Artifacts
Calendar       ────────► Calendar
Notifications  ────────► Notifications
AI             ────────► AI
Search         ────────► Search
```

---

# 5. Database

## PostgreSQL

PostgreSQL is the **source of truth** for Nexus.

```
PostgreSQL
│
├── Users
├── Workspaces
├── Projects
├── Milestones
├── Tasks
├── Knowledge
├── Documents
├── Artifacts
├── Artifact Versions
├── Calendar Events
├── Notifications
├── Activity
└── AI Conversations
```

## Drizzle

Drizzle provides:

- Type-safe queries
- Schema management
- Migrations
- Relations
- Database client

---

# 6. Vector Search

For the initial Nexus version:

> **PostgreSQL + pgvector**

No dedicated vector database.

```
File
 ↓
Object Storage
 ↓
Text Extraction
 ↓
Chunking
 ↓
Embeddings
 ↓
PostgreSQL + pgvector
 ↓
Semantic Search
 ↓
AI
```

This keeps the architecture simple while still supporting RAG.

If Nexus eventually reaches a scale where PostgreSQL vector search becomes a bottleneck, we can evaluate a dedicated vector database later.

---

# 7. Redis + BullMQ

Redis has two major roles:

```
Redis
│
├── Cache
│
├── Rate Limiting
│
├── Ephemeral State
│
└── BullMQ
      │
      └── Background Jobs
```

BullMQ handles long-running or asynchronous operations.

### Knowledge Processing

```
Upload PDF
     ↓
Create Job
     ↓
BullMQ
     ↓
Knowledge Worker
     ↓
Extract Text
     ↓
Chunk
     ↓
Generate Embeddings
     ↓
Store in pgvector
     ↓
Knowledge = READY
```

### Artifact Generation

```
Generate Presentation
        ↓
      BullMQ
        ↓
 Artifact Worker
        ↓
 Gather Context
        ↓
      AI
        ↓
 Generate PPTX
        ↓
    Upload S3
        ↓
Create Artifact Version
```

### Other jobs

```
artifact.generate
knowledge.process
knowledge.embed
document.export
notification.send
ai.generate
file.process
```

BullMQ gives us:

- Retries
- Backoff
- Concurrency
- Delayed jobs
- Job priorities
- Failure handling
- Worker scaling

---

# 8. Object Storage

Use an S3-compatible object storage layer.

### Development

**MinIO**

### Production

**AWS S3**

Store large files here rather than PostgreSQL.

```
PostgreSQL
   │
   └── File metadata
           │
           ▼
       MinIO / S3
           │
           └── Actual file
```

Examples:

- PDFs
- Images
- DOCX
- CSV
- PPTX
- XLSX
- Generated reports
- Exported artifacts

---

# 9. AI Stack

The AI layer should be **provider-independent**.

```
                     AI Module
                         │
                ┌────────┴────────┐
                ▼                 ▼
             LLM API          Embeddings
                │                 │
         ┌──────┴──────┐          │
         ▼             ▼          ▼
      OpenAI       Anthropic   pgvector
```

Start with:

- **OpenAI**
- **Anthropic**

The backend should expose an abstraction instead of coupling Nexus directly to one provider.

```
AI Service
    │
    ├── Chat
    ├── Summarization
    ├── Generation
    ├── Extraction
    └── Suggestions
          │
          ▼
    LLM Provider
```

This lets us change models without rewriting the application.

---

# 10. AI + Nexus Context

AI is built around the project's context.

```
Project
   │
   ├── Knowledge
   ├── Documents
   ├── Tasks
   ├── Artifacts
   ├── Activity
   └── Conversations
             │
             ▼
        Context Builder
             │
             ▼
             AI
```

For example:

```
"Create a presentation from this report"
             │
             ▼
      Project Context
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
    Report Knowledge Previous
             │      Artifacts
             └──┬───┘
                ▼
               AI
                │
                ▼
          Presentation
```

---

# 11. Realtime

Use **SSE first**, WebSocket where bidirectional communication is actually required.

### AI streaming

```
User
 ↓
Hono
 ↓
AI Provider
 ↓
SSE
 ↓
React
 ↓
Streaming Response
```

### Background job updates

```
Artifact Worker
      ↓
Job completed
      ↓
Backend
      ↓
SSE
      ↓
Frontend
      ↓
"Artifact ready"
```

We don't need WebSockets everywhere.

---

# 12. Infrastructure

### Development

```
Docker Compose
│
├── Nexus API
├── PostgreSQL
├── Redis
├── MinIO
└── Workers
```

### Production

```
                    VPS / Cloud
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
         Next.js       Hono       Workers
            │           │           │
            └───────────┼───────────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
        PostgreSQL    Redis       S3
             │          │
          pgvector    BullMQ
                        │
                     Workers
```

For the first deployment, **Docker + Coolify/VPS** is enough.

Kubernetes is intentionally left for later.

---

# 13. Observability

Keep observability simple initially.

```
Observability
│
├── Structured Logging
├── Error Tracking
├── Metrics
└── Tracing
```

Potential tools:

```
Sentry
OpenTelemetry
Prometheus
Grafana
```

Don't deploy the entire observability stack on day one. Add it as the system grows.

---

# 14. Complete Nexus Stack

## Frontend

```
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Tiptap
TanStack Query
Zustand
React Hook Form
Zod
BetterAuth
SSE / WebSocket
Lucide
```

## Backend

```
Bun
Hono
TypeScript
Drizzle
Zod
Better Auth
```

## Database

```
PostgreSQL
pgvector
```

## Cache & Background Processing

```
Redis
BullMQ
```

## Storage

```
MinIO → Development
AWS S3 → Production
```

## AI

```
OpenAI
Anthropic
Embeddings
RAG
```

## Infrastructure

```
Docker
Docker Compose
Coolify / VPS
```

## Observability

```
Sentry
OpenTelemetry
Prometheus / Grafana
```

---

# 15. What We Are Intentionally NOT Using

This is important because the architecture is better when we explain **why something isn't there**.

### Kafka

**Not initially.**

BullMQ handles Nexus's background workloads better.

Kafka becomes relevant if we eventually need large-scale event streaming, event replay, or many independent consumers.

### Kubernetes

**Not initially.**

Docker + Coolify/VPS is enough.

### Dedicated Vector Database

**Not initially.**

PostgreSQL + pgvector is enough.

### Microservices

**Not initially.**

Use a modular monolith first.

### Multiple AI providers simultaneously

**Not necessary.**

Create the provider abstraction, then use whichever models provide the best cost/quality for each workload.

---

# 16. Final Architecture

```
                         NEXUS
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       FRONTEND                           BACKEND
          │                                 │
      Next.js                              Hono
      React                               Bun
      TypeScript                          TypeScript
          │                                 │
   ┌──────┼──────┐                  Modular Monolith
   │      │      │                         │
  UI    State   Data             ┌─────────┼─────────┐
   │      │      │               │         │         │
   ▼      ▼      ▼               ▼         ▼         ▼
Tailwind Zustand TanStack     Projects  Planner  Knowledge
shadcn            Query          │         │         │
Tiptap                          Artifacts Calendar    AI
                                │         │
                                └────┬────┘
                                     │
                              PostgreSQL
                                     │
                                  pgvector
                                     │
                                  Redis
                                     │
                                  BullMQ
                                     │
                         ┌───────────┼───────────┐
                         ▼           ▼           ▼
                     AI Worker   Artifact   Knowledge
                                  Worker      Worker
                         │           │           │
                         └───────────┼───────────┘
                                     ▼
                                  MinIO/S3
                                     │
                                     ▼
                               AI Providers
                              ┌──────┴──────┐
                              ▼             ▼
                           OpenAI       Anthropic
```
