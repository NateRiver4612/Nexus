# Development Plan

## Core AI Architecture

I'd recommend this stack:

| Area                 | Technology           |
| -------------------- | -------------------- |
| AI orchestration     | **LangGraph**        |
| LLM provider         | Provider abstraction |
| Structured AI output | Zod schemas          |
| Backend              | Hono                 |
| ORM                  | Drizzle              |
| Database             | PostgreSQL           |
| Vector search        | pgvector             |
| Queue                | BullMQ               |
| Queue storage        | Redis                |
| Files                | S3 / MinIO           |
| Artifact generation  | TypeScript libraries |
| Frontend             | Next.js + React      |
| Editor               | Tiptap               |
| Validation           | Zod                  |
| AI streaming         | SSE                  |
| Monitoring           | Sentry               |
| Deployment           | Docker + VPS/Coolify |

LangGraph is particularly appropriate once you need **stateful workflows, persistence, streaming, and human approval**, rather than simply calling an LLM once.

But don't over-engineer it on Day 1.

---

# Week 1 — Foundation

### Goal

Get the application and infrastructure running.

### Tasks

- [x] Monorepo
- [x] Next.js
- [x] Hono
- [x] PostgreSQL
- [x] Drizzle
- [x] Redis
- [x] BullMQ
- [ ] S3/MinIO
- [x] Docker Compose
- [x] Environment configuration
- [x] ESLint
- [x] TypeScript
- [x] CI
- [x] Basic logging
- [x] Error handling

### Important recommendation

Create your AI module **now**, even though it won't do much yet.

```
apps/api/src/modules/

auth/
projects/
ai/
planner/
knowledge/
artifacts/
notifications/
```

Inside:

```
ai/
├── ai.service.ts
├── ai.provider.ts
├── ai.schemas.ts
├── ai.prompts.ts
└── workflows/
```

Don't put AI code directly inside your project controller.

---

# Week 2 — Authentication + Project Foundation

### Goal

Create the minimum project system required for AI Kickoff.

### Build

- [ ] Authentication
- [ ] Workspace
- [ ] Project
- [ ] Project goal
- [ ] Project description
- [ ] Project status
- [ ] Project CRUD
- [ ] Project creation UI
- [ ] Project detail route

At this point:

```
User
 ↓
Workspace
 ↓
Create Project
 ↓
Project Goal
```

---

# Week 3 — 🚀 AI Project Kickoff

This is where I would move AI **much earlier**.

## Goal

User gives Nexus a project idea and Nexus helps turn it into an actionable project structure.

For example:

> "I want to launch a Vietnamese coffee subscription business."

Nexus should produce something like:

```
Project Goal
Launch Vietnamese coffee subscription business

Suggested Deliverables

✓ Market Research Report
✓ Business Proposal
✓ Financial Model
✓ Launch Presentation

Suggested Milestones

1. Market Research
2. Business Planning
3. Financial Planning
4. Launch Preparation

Suggested Tasks

Research competitors
Identify target customers
Define pricing
Estimate costs
Create launch strategy
```

### But here's the important architectural rule

AI **suggests**.

It doesn't directly create everything.

```
User Input
    ↓
AI Kickoff
    ↓
Structured Suggestions
    ↓
User Reviews
    ↓
User Accepts
    ↓
Create Project Structure
```

This matches the product philosophy we've established.

---

# AI Kickoff Architecture

I'd implement:

```
POST /projects/kickoff
        │
        ▼
Kickoff Service
        │
        ▼
Project Context Builder
        │
        ▼
AI Workflow
        │
        ▼
Structured Output
        │
        ▼
Validation
        │
        ▼
Kickoff Result
```

### AI output

Do **not** accept arbitrary AI text.

Define a schema.

Something roughly like:

```
constprojectKickoffSchema=z.object({
  projectSummary:z.string(),

  deliverables:z.array(z.object({
      title:z.string(),
      description:z.string(),
      type:z.enum(["report","presentation","spreadsheet","document",
      ]),
    })
  ),

  milestones:z.array(z.object({
      title:z.string(),
      description:z.string(),
    })
  ),

  tasks:z.array(z.object({
      title:z.string(),
      description:z.string(),
      priority:z.enum(["low","medium","high"]),
    })
  ),
});
```

The exact schema will evolve.

The principle shouldn't.

> **LLM output → schema validation → application logic**

Never:

```
LLM → database
```

---

# AI Provider Abstraction

Don't couple Nexus directly to one model provider.

Create:

```
interfaceAIProvider {
  generateText(...)
  generateStructured<T>(...)
  streamText(...)
}
```

Then:

```
AIProvider
   │
   ├── OpenAIProvider
   ├── AnthropicProvider
   └── OpenAICompatibleProvider
```

This is especially important for you because you want to experiment with cheap/free models.

You should be able to change:

```
AI_PROVIDER=...
AI_MODEL=...
```

without rewriting your application.

---

# Week 3 Deliverable

You should be able to demonstrate:

```
Create Project

"I'm building an online course
for junior developers."

        ↓

AI Kickoff

Project Summary

Suggested Deliverables
├── Course Curriculum
├── Course Presentation
└── Study Guide

Milestones
├── Research
├── Curriculum
├── Content
└── Launch

Suggested Tasks
├── Research audience
├── Define curriculum
├── Create modules
└── Prepare launch material

        ↓

Accept

        ↓

Project Created
```

**That is your first real Nexus demo.**

---

# Week 4 — Planner + Task System

Now take the AI Kickoff output and make it real.

### Planner

- [ ] Milestones
- [ ] Tasks
- [ ] Task status
- [ ] Priority
- [ ] Due dates
- [ ] Ordering
- [ ] Progress
- [ ] Task relationships

### Important

AI Kickoff creates **suggestions**.

The Planner stores **user-approved project state**.

That's a very important boundary.

```
AI
 ↓
Suggestion

User
 ↓
Approval

Database
 ↓
Actual Project State
```

---

# Week 5 — Task Session + Continue Working

This is where your **"video game save point"** idea becomes real.

### Task Session

```
Task
 │
 ├── Context
 ├── Notes
 ├── AI Chat
 ├── Knowledge
 ├── Files
 └── Related Artifacts
```

### Continue Working

Track:

```
lastProject
lastMilestone
lastTask
lastSession
```

Then:

```
Continue Working
       ↓
Current Mission
       ↓
Task Session
```

The user should feel:

> "I know exactly where I left off."

---

# Week 6 — Knowledge

Now give AI real project context.

### Build

- [ ] S3/MinIO
- [ ] Presigned uploads
- [ ] File metadata
- [ ] PDF extraction
- [ ] DOCX extraction
- [ ] TXT/Markdown
- [ ] CSV
- [ ] Image OCR
- [ ] Processing status
- [ ] BullMQ workers

BullMQ is a good fit here because it gives you queues, workers, retries, delayed jobs, priorities and concurrency on top of Redis.

For example:

```
Upload
 ↓
knowledge-processing queue
 ↓
Worker
 ↓
Extract
 ↓
Chunk
 ↓
Embed
 ↓
Store
```

Use retries with exponential backoff for external/API processing failures rather than trying to handle everything synchronously.

---

# Week 7 — RAG + AI Context

Now upgrade AI Kickoff/Chat from:

> "AI knows what the user typed."

to:

> "AI knows the project."

Build:

```
Project Context
      +
Knowledge Retrieval
      +
Tasks
      +
Artifacts
      +
Conversation
      ↓
     AI
```

### Implement

- [ ] pgvector
- [ ] Embeddings
- [ ] Chunk retrieval
- [ ] Project filtering
- [ ] Context ranking
- [ ] Context builder
- [ ] Source citations
- [ ] Project chat
- [ ] Streaming

---

# Week 8 — Artifacts

Now AI can actually **produce work**.

Start with only:

### 1. Reports

### 2. Presentations

### 3. Spreadsheets

Build:

```
AI
 ↓
Artifact Specification
 ↓
Generator
 ↓
File
 ↓
S3
 ↓
Artifact
 ↓
Version
```

Don't make the AI directly generate raw binary files.

Instead:

```
AI
 ↓
Structured Artifact Data
 ↓
TypeScript Generator
 ↓
DOCX/PPTX/XLSX/PDF
```

This gives you much better control.

---

# Week 9 — Artifact Editing + AI Collaboration

This is where **Tiptap** comes in.

Use Tiptap for editable document-style artifacts rather than trying to build an editor yourself.

### Build

- [ ] Tiptap editor
- [ ] Document state
- [ ] Save
- [ ] Autosave
- [ ] Versioning
- [ ] AI rewrite
- [ ] AI summarize
- [ ] AI expand
- [ ] AI improve
- [ ] Regenerate

The interaction becomes:

```
Generate
   ↓
Preview
   ↓
Open
   ↓
Edit
   ↓
AI Assist
   ↓
Save Version
```

That's much closer to your original Nexus vision.

---

# Week 10 — AI Project Intelligence

Now we make AI proactive.

### Project Health

AI evaluates:

```
Tasks
Milestones
Deadlines
Knowledge
Artifacts
Activity
```

and produces:

```
Project Health

On Track

⚠ Presentation hasn't been created
⚠ Milestone due in 3 days
✓ Research completed
✓ Business proposal completed
```

### AI Suggestions

Examples:

> "Your research report is complete. Generate the presentation?"

> "You have enough research to start the proposal."

> "Three tasks are blocked by missing financial data."

> "Your milestone is approaching and 4 tasks remain."

Again:

```
Observe
 ↓
Analyze
 ↓
Suggest
 ↓
User decides
```

---

# Week 11 — Global Planner + Calendar + Notifications

Now connect everything.

### Global Planner

```
All Projects
     ↓
Tasks
     ↓
Milestones
     ↓
Deadlines
     ↓
Calendar
```

AI can say:

> "You have three high-priority tasks across two projects this week."

But it shouldn't automatically rearrange the user's life.

---

# Week 12 — Search + Production

### Search

- [ ] Projects
- [ ] Tasks
- [ ] Artifacts
- [ ] Knowledge
- [ ] Conversations
- [ ] Calendar

### Command Palette

```
⌘K
```

### Production

- [ ] Tests
- [ ] Security
- [ ] Rate limits
- [ ] Logging
- [ ] Sentry
- [ ] AI usage tracking
- [ ] Worker monitoring
- [ ] Database backups
- [ ] Deployment
- [ ] CI/CD

---

# The AI Stack I'd Actually Use

Don't use 10 AI frameworks.

I'd keep it surprisingly small.

## 1. LangGraph

Use it for **workflow orchestration**, not every single AI call.

It's designed for long-running/stateful workflows, persistence, streaming and human-in-the-loop execution.

For Nexus:

```
AI Kickoff
AI Research
AI Artifact Generation
AI Project Analysis
```

are good candidates for workflows.

But:

```
"Rewrite this sentence"
```

doesn't need LangGraph.

---

## 2. Zod

Use Zod as the contract between AI and your backend.

```
LLM
 ↓
Structured Output
 ↓
Zod
 ↓
Business Logic
```

This is **non-negotiable** for a system like Nexus.

---

## 3. BullMQ

Use BullMQ for anything that shouldn't block an HTTP request:

```
Artifact generation
File processing
Embeddings
OCR
AI workflows
Email
Notifications
```

BullMQ supports worker concurrency and horizontal scaling, so you don't need Kafka for this architecture.

---

# One Important Distinction

I would **not** do this:

```
Hono
 ↓
LangGraph
 ↓
BullMQ
 ↓
AI
```

for every request.

Instead:

### Fast AI

```
Frontend
 ↓
Hono
 ↓
AI Service
 ↓
LLM
 ↓
Stream response
```

For example:

> "Summarize this paragraph."

---

### Long-running AI

```
Frontend
 ↓
Hono
 ↓
BullMQ
 ↓
AI Worker
 ↓
LangGraph
 ↓
LLM
 ↓
Artifact
```

For example:

> "Analyze 30 PDFs and create a market research report."

This distinction will keep Nexus much simpler.

---

# AI Kickoff — Recommended First Implementation

If I were you, **this is literally the first AI feature I'd build**.

### API

```
POST /projects/kickoff
```

### Input

```
{name:string;goal:string;description?:string;
}
```

### AI

```
Project Goal
     ↓
Prompt
     ↓
LLM
     ↓
Structured ProjectKickoff
     ↓
Zod validation
```

### Response

```
{summary,deliverables[],milestones[],tasks[]
}
```

### Frontend

Show:

```
┌──────────────────────────────────────────────┐
│ AI Project Kickoff                           │
│                                              │
│ Here's how I'd structure your project.       │
│                                              │
│ Deliverables                                 │
│ ☑ Market Research Report                    │
│ ☑ Business Proposal                          │
│ ☑ Financial Model                            │
│                                              │
│ Milestones                                   │
│ 1. Research                                  │
│ 2. Planning                                  │
│ 3. Financials                                │
│ 4. Launch                                    │
│                                              │
│ Suggested Tasks                              │
│ ☑ Research competitors                       │
│ ☑ Define target customer                     │
│ ☑ Determine pricing                          │
│                                              │
│ [Accept & Create Project]                    │
└──────────────────────────────────────────────┘
```

That's a **vertical slice** touching:

```
Next.js
   ↓
Hono
   ↓
AI Service
   ↓
LLM
   ↓
Zod
   ↓
Drizzle
   ↓
PostgreSQL
```

So you learn the entire architecture very early.

---

# Later: AI Agent Permissions

As Nexus gets more autonomous, introduce explicit tool permissions.

For example:

```
AI can READ:
✓ Project
✓ Tasks
✓ Knowledge
✓ Artifacts
✓ Calendar

AI can SUGGEST:
✓ Create task
✓ Create milestone
✓ Generate artifact
✓ Schedule work

AI can WRITE only after:
✓ User approval
```

This fits very well with the human-in-the-loop approach supported by LangGraph, where execution can pause, show the proposed action, and resume after approval.

That gives us a clean long-term model:

```
             AI
              │
       ┌──────┴──────┐
       ▼             ▼
     READ          SUGGEST
       │             │
       │             ▼
       │          USER
       │          APPROVAL
       │             │
       └──────┬──────┘
              ▼
           EXECUTE
```

That is **much safer and easier to reason about** than giving an agent unrestricted access to the database.

---

# Recommended Documentation / Libraries

I'd bookmark these:

- [LangGraph documentation](https://docs.langchain.com/oss/javascript/langgraph/overview?utm_source=chatgpt.com) — workflow/stateful agent architecture.
- [LangGraph Human-in-the-Loop](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop?utm_source=chatgpt.com) — approval-based AI actions.
- [BullMQ documentation](https://docs.bullmq.io/?utm_source=chatgpt.com) — queues, workers, retries, scheduling.
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview?utm_source=chatgpt.com) — database layer.
- [Tiptap documentation](https://tiptap.dev/docs?utm_source=chatgpt.com) — editable document/artifact experience.
- [Zod documentation](https://zod.dev/?utm_source=chatgpt.com) — runtime schemas and validation.
