# Backend Architecture

> **Architecture principle:** Nexus is a **modular monolith** built around PostgreSQL, with **Redis + BullMQ** handling asynchronous workloads. AI, knowledge processing, and artifact generation run through background workers, while the core application remains simple and user-controlled.

---

# 1. Architecture Overview

```
                         NEXUS BACKEND
                              │
                              ▼
                         Hono API
                              │
                    ┌─────────┴─────────┐
                    │                   │
              Domain Modules       Infrastructure
                    │                   │
       ┌────────────┼────────────┐      │
       │            │            │      │
    Projects      Planner     Knowledge  │
    Artifacts     Calendar    AI          │
    Search        Notifications          │
       │            │            │       │
       └────────────┼────────────┘       │
                    │                    │
                    ▼                    ▼
                PostgreSQL             Redis
                    │                    │
                 pgvector             BullMQ
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                         AI Worker   Artifact   Knowledge
                                      Worker      Worker
                              │          │          │
                              └──────────┼──────────┘
                                         ▼
                                      S3 / MinIO
```

### Core infrastructure

| Layer         | Technology               | Responsibility              |
| ------------- | ------------------------ | --------------------------- |
| API           | **Hono + Bun**           | HTTP API                    |
| Architecture  | **Modular Monolith**     | Domain organization         |
| Database      | **PostgreSQL + Drizzle** | Source of truth             |
| Vector Search | **pgvector**             | Semantic search / RAG       |
| Cache         | **Redis**                | Caching, rate limiting      |
| Jobs          | **BullMQ**               | Background processing       |
| Workers       | **Bun**                  | Async workloads             |
| Storage       | **S3 / MinIO**           | Files & generated artifacts |
| AI            | **OpenAI / Anthropic**   | AI capabilities             |

**No Kafka. No microservices. No Kubernetes.**

---

# 2. Request Architecture

Nexus has two types of backend operations.

### Synchronous

Used for normal application operations:

```
Frontend
   │
   ▼
Hono API
   │
   ▼
Domain Module
   │
   ▼
PostgreSQL
   │
   ▼
Response
```

Examples:

- Create project
- Update task
- Create calendar event
- Rename artifact
- Mark notification as read
- Update project settings

### Asynchronous

Used for expensive or long-running work:

```
Frontend
   │
   ▼
Hono API
   │
   ▼
Domain Module
   │
   ▼
BullMQ
   │
   ▼
Worker
   │
   ├── AI
   ├── S3
   └── PostgreSQL
```

Examples:

- Generate presentation
- Process PDF
- Generate embeddings
- Create spreadsheet
- Export document
- OCR images
- Generate AI report

---

# 3. Modular Monolith

Nexus starts as **one backend application**.

The application is divided by **business domain**, not by infrastructure.

```
backend/
│
├── Projects
├── Planner
├── Knowledge
├── Artifacts
├── Calendar
├── Notifications
├── Search
└── AI
```

Each module owns its business logic.

```
Module
│
├── Routes
├── Controller
├── Service
├── Repository
├── Schema
└── Types
```

The typical flow is:

```
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL
```

This gives Nexus clear boundaries without the complexity of microservices.

---

# 4. Core Domain Modules

## Projects

Projects are the **main context boundary** of Nexus.

```
Project
│
├── Planner
├── Knowledge
├── Artifacts
├── Calendar
├── Activity
└── AI Context
```

Responsible for:

- Project creation
- Project settings
- Project members
- Project overview
- Project status
- Project context

---

## Planner

The Planner manages how users move through a project.

```
Planner
│
├── Milestones
├── Tasks
├── Progress
├── Journey
└── Resume Working
```

The user remains in control.

AI can suggest:

- Next task
- Missing step
- Possible follow-up
- Project health issue

But AI does not silently schedule or modify the user's work.

---

## Knowledge

Knowledge turns project information into reusable context.

```
Knowledge
│
├── Files
├── Documents
├── Collections
├── Processing
├── Embeddings
└── Retrieval
```

Typical pipeline:

```
Upload
  ↓
Process
  ↓
Extract
  ↓
Chunk
  ↓
Embed
  ↓
Index
```

---

## Artifacts

Artifacts are the **deliverables produced from project work**.

```
Artifacts
│
├── Reports
├── Presentations
├── Spreadsheets
├── Proposals
├── PDFs
└── Other Documents
        │
        ▼
     Versions
```

Artifacts support:

- Generation
- Preview
- Editing
- Versioning
- Regeneration
- Export

---

## Calendar

Responsible for:

- Events
- Deadlines
- Reminders
- Project scheduling

Scheduling is primarily **user-controlled**.

AI may assist, but the calendar itself remains deterministic.

---

## Notifications

Handles:

- Artifact completion
- Knowledge processing
- Upcoming deadlines
- Reminders
- Project activity

```
Notification
├── Type
├── Message
├── Read State
└── User
```

---

## Search

Provides one search layer across Nexus:

```
Projects
Documents
Artifacts
Knowledge
Tasks
Calendar
Activity
```

Search can combine:

```
Keyword Search
      +
Semantic Search
```

---

## AI

AI is a **capability used by the other modules**, rather than a separate destination.

```
                      AI
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Projects     Knowledge    Artifacts
          │            │            │
          └────────────┼────────────┘
                       ▼
                Context Builder
                       │
                       ▼
                  AI Provider
```

---

# 5. Data Architecture

PostgreSQL is the **source of truth**.

```
                         PostgreSQL
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    Workspace              Project                 User
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
          Planner          Knowledge        Artifacts
             │                │                │
          Tasks          Documents          Versions
        Milestones          Chunks
                              │
                           pgvector
```

### Drizzle

Drizzle ORM provides:

- Type-safe database access
- Schema management
- Migrations
- Relations
- Query abstraction

---

# 6. Redis + BullMQ

Redis has two primary roles:

```
Redis
│
├── Cache
├── Rate Limiting
└── BullMQ
      │
      └── Background Jobs
```

BullMQ handles work that shouldn't block an API request.

```
                    BullMQ
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    AI Worker      Artifact Worker  Knowledge Worker
        │              │              │
        ▼              ▼              ▼
       LLM            S3          PostgreSQL
```

Typical jobs:

```
ai.generate
artifact.generate
artifact.export
knowledge.process
knowledge.embed
file.process
notification.send
```

BullMQ provides:

- Retries
- Backoff
- Concurrency
- Delayed jobs
- Job priorities
- Failure handling

---

# 7. File Storage

Large files are stored in object storage.

```
User
 │
 ▼
Upload
 │
 ▼
S3 / MinIO
 │
 └── Actual File

PostgreSQL
 │
 └── File Metadata
```

### Development

**MinIO**

### Production

**AWS S3**

Examples:

- PDF
- DOCX
- CSV
- Images
- PPTX
- XLSX
- Generated artifacts

---

# 8. Knowledge Processing

```
                 User Upload
                      │
                      ▼
                  S3 / MinIO
                      │
                      ▼
                    BullMQ
                      │
                      ▼
              Knowledge Worker
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
         Extract    Chunk     Metadata
            │         │
            └────┬────┘
                 ▼
             Embeddings
                 │
                 ▼
          PostgreSQL + pgvector
```

Once indexed, the knowledge becomes available to the project's AI context.

---

# 9. AI Context Architecture

Nexus's AI is **project-aware**.

```
                       Project
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
     Knowledge        Artifacts         Planner
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                   Context Builder
                          │
                          ▼
                      AI Service
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
              OpenAI           Anthropic
```

For example:

> "Create a presentation from my research."

Nexus can gather:

```
Project
+
Relevant Knowledge
+
Existing Report
+
Previous Artifacts
```

and provide the relevant context to the model.

---

# 10. Artifact Generation

A complete artifact flow:

```
User
 │
 │ "Generate Presentation"
 ▼
Artifact API
 │
 ▼
Artifact Service
 │
 ├── Gather Project Context
 ├── Create Artifact
 └── Create Job
          │
          ▼
       BullMQ
          │
          ▼
    Artifact Worker
          │
          ├── Retrieve Knowledge
          ├── Call AI
          ├── Generate PPTX
          └── Upload S3
                  │
                  ▼
             Artifact Version
                  │
                  ▼
             Notification
```

The API doesn't wait for the entire AI generation process.

---

# 11. AI Provider Layer

Nexus shouldn't couple the application directly to one AI provider.

```
                 AI Service
                     │
                AI Provider
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
        OpenAI              Anthropic
```

This allows us to choose models based on:

- Cost
- Speed
- Quality
- Context size
- Task complexity

We can use cheaper models for simple operations and stronger models only when necessary.

---

# 12. Authentication & Authorization

Authentication:

```
User
 │
 ▼
Better Auth
 │
 ▼
Nexus API
```

Authorization is handled by Nexus.

```
Request
  ↓
Authenticated User
  ↓
Workspace Membership
  ↓
Project Access
  ↓
Resource Permission
  ↓
Domain Service
```

This separates:

**Authentication → "Who are you?"**

from:

**Authorization → "What are you allowed to do?"**

---

# 13. Realtime

Use **SSE** for most realtime requirements.

```
Worker
  │
  ▼
Backend
  │
  ▼
SSE
  │
  ▼
Next.js
```

Useful for:

- AI streaming
- Artifact generation progress
- Knowledge indexing status
- Notifications

WebSockets aren't necessary unless Nexus later develops a genuine bidirectional realtime requirement.

---

# 14. Caching

Redis can cache frequently accessed or expensive data.

```
Request
  │
  ▼
Redis
 ┌┴┐
Hit Miss
 │   │
 ▼   ▼
Return PostgreSQL
       │
       ▼
      Redis
```

Potential candidates:

- Project summaries
- Search results
- User preferences
- AI context
- Rate limits

PostgreSQL remains the source of truth.

---

# 15. Backend Codebase

```
backend/
│
├── src/
│   │
│   ├── app/
│   │   ├── routes.ts
│   │   ├── middleware.ts
│   │   └── error-handler.ts
│   │
│   ├── modules/
│   │   ├── projects/
│   │   ├── planner/
│   │   ├── knowledge/
│   │   ├── artifacts/
│   │   ├── calendar/
│   │   ├── notifications/
│   │   ├── search/
│   │   └── ai/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── queue/
│   │   ├── storage/
│   │   └── ai/
│   │
│   ├── workers/
│   │   ├── ai.worker.ts
│   │   ├── artifact.worker.ts
│   │   ├── knowledge.worker.ts
│   │   └── notification.worker.ts
│   │
│   └── shared/
│
├── drizzle/
│   └── migrations/
│
└── package.json
```

---

# 16. Scaling Strategy

We scale **inside the architecture before changing the architecture**.

### Start

```
Next.js
   │
   ▼
Hono
   │
   ├── PostgreSQL
   ├── Redis
   └── S3 / MinIO
          │
        BullMQ
          │
       Workers
```

### When workload increases

Scale workers independently:

```
AI Workers        × N
Artifact Workers  × N
Knowledge Workers × N
```

The API doesn't need to become a collection of microservices.
