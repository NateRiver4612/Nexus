# AI Architecture

> **Purpose:** Define how AI understands project context, reasons over knowledge, generates suggestions and artifacts, and interacts with Nexus while keeping users in control.

---

# 1. AI Architecture Overview

Nexus AI is not a standalone chatbot.

It is an **intelligence layer** that sits across the workspace and uses project context to help users complete meaningful work.

```
                         Nexus AI
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       Context           Reasoning         Actions
          │                 │                 │
          ▼                 ▼                 ▼
     Project Data       AI Workflows      Suggestions
     Knowledge          LLM Provider      Artifacts
     Tasks              Structured AI     Analysis
     Artifacts                            Planning
     Activity
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                       User Approval
                            │
                            ▼
                      Nexus Application
```

### Core principle

> **AI understands, reasons, and suggests. Nexus executes.**

AI should not directly manipulate application state without going through the application's validation and authorization layer.

---

# 2. AI Responsibilities

Nexus AI has five primary responsibilities:

### 1. Understand

Understand the user's:

- Project
- Goals
- Tasks
- Knowledge
- Artifacts
- Conversations
- Activity
- Deadlines

### 2. Reason

Use that context to:

- Analyze projects
- Break down goals
- Identify relationships
- Evaluate project health
- Determine useful next steps

### 3. Suggest

Provide:

- Tasks
- Milestones
- Deliverables
- Next actions
- Project health insights
- Artifact recommendations

### 4. Create

Generate useful work:

- Reports
- Presentations
- Spreadsheets
- Documents
- Summaries
- Study materials

### 5. Assist

Help users while they work:

- Chat
- Writing assistance
- Research
- Summarization
- Editing
- Voice interaction

---

# 3. AI Context Model

The most important part of Nexus AI is **context**.

AI should never operate only on the latest user message when project context is available.

```
User Request
     │
     ▼
Context Builder
     │
     ├── Project
     ├── Tasks
     ├── Milestones
     ├── Knowledge
     ├── Artifacts
     ├── Conversations
     ├── Activity
     └── Calendar
     │
     ▼
Relevant Context
     │
     ▼
AI
```

The Context Builder is responsible for deciding:

> **What does the AI actually need to know for this request?**

---

# 4. Context Layers

AI context should be organized into layers rather than dumping the entire workspace into every prompt.

## Layer 1 — Workspace Context

Basic information:

- User
- Workspace
- Preferences

---

## Layer 2 — Project Context

The current project:

- Project name
- Goal
- Description
- Status
- Milestones
- Progress

---

## Layer 3 — Work Context

Current execution state:

- Current task
- Related tasks
- Task status
- Deadlines
- Recent activity

---

## Layer 4 — Knowledge Context

Relevant information retrieved from:

- PDFs
- DOCX
- Markdown
- TXT
- CSV
- Images
- Project documents
- Previous conversations

---

## Layer 5 — Artifact Context

Existing outputs:

- Reports
- Presentations
- Spreadsheets
- Documents
- Artifact versions

---

## Layer 6 — Conversation Context

Relevant:

- Previous messages
- Decisions
- User instructions
- AI responses

---

# 5. Context Retrieval

Nexus should not send everything to the LLM.

Instead:

```
User Request
      ↓
Understand Intent
      ↓
Determine Required Context
      ↓
Retrieve Relevant Data
      ↓
Rank / Filter
      ↓
Build Context
      ↓
LLM
```

For knowledge-heavy requests:

```
Query
 ↓
Embedding
 ↓
pgvector
 ↓
Relevant Chunks
 ↓
Context Builder
 ↓
LLM
```

This becomes the foundation of Nexus RAG.

**Implementation note:** Kickoff's context retrieval (`buildKnowledgeContext`) uses a floor-and-fill strategy — every knowledge source gets a guaranteed minimum of chunks (so no uploaded source is silently starved out), with remaining budget filled by the best-ranked chunks project-wide. For requests spanning multiple distinct sub-topics (e.g. a single long tutorial covering setup, core logic, testing, and deployment), a single query embedding tends to favor whichever sub-topic the goal text emphasizes most. Where that matters, prefer a small fixed set of aspect-specific queries over one global query, rather than trying to fix it by over-fetching.

---

# 6. AI Provider Layer

Nexus should not depend directly on a single AI provider.

Create an abstraction:

```
                    AI Provider
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       Provider A    Provider B    Compatible
```

Conceptually:

```
interfaceAIProvider {
  generateText()
  generateStructured()
  streamText()
}
```

The rest of Nexus should communicate with the abstraction rather than directly with a specific provider.

### Why?

You want to be able to:

- Change models
- Test cheaper models
- Use different models for different workloads
- Add fallback providers
- Control AI costs

without rewriting the AI architecture.

**Implementation note:** domain modules (kickoff included) should call this abstraction, never a provider SDK directly. If a domain module is currently instantiating a provider client inline, that's a gap to close before adding more AI-driven modules — otherwise a future provider swap means hunting down every call site instead of changing one place.

---

# 7. Model Strategy

Don't use one expensive model for everything.

Different AI workloads can use different models.

| Workload            | Model Priority   |
| ------------------- | ---------------- |
| Simple rewrite      | Cheap / fast     |
| Summarization       | Cheap / fast     |
| Classification      | Cheap            |
| Project chat        | Medium           |
| Project Kickoff     | Strong reasoning |
| Research            | Strong reasoning |
| Artifact generation | Strong reasoning |
| Project Health      | Strong reasoning |
| Complex workflows   | Best available   |

The application should select the model based on the task rather than making the model choice globally fixed.

---

# 8. Structured AI Output

AI-generated data that affects the application should always be structured.

Example:

```
LLM
 ↓
Structured Output
 ↓
Zod Validation
 ↓
Application Logic
```

For example, AI Project Kickoff should return:

```
Project Summary

Deliverables[]
Milestones[]
Tasks[]
```

Not:

```
"Here are some things you should probably do..."
```

The first can safely become application data after validation.

**Implementation note:** prefer provider-native structured output (forced tool-calling against a Zod-derived JSON schema, e.g. `z.toJSONSchema()`) over prompting for prose-formatted JSON. It's more reliable, and a single schema can drive both the tool definition and the post-generation validation — no risk of the two drifting out of sync.

---

# 9. AI Workflow Architecture

Nexus has two types of AI operations — the distinction is **synchronous vs. background**, not "simple vs. complex." A multi-step operation is not automatically a LangGraph candidate; see Section 10 for the actual bar.

## Simple AI Operations

For short, synchronous operations where the user is waiting:

```
Frontend
   ↓
Hono
   ↓
AI Service
   ↓
LLM
   ↓
Streaming Response
```

Examples:

- Rewrite text
- Summarize
- Simple chat
- Explain something
- Improve writing

## Multi-step AI Operations (BullMQ, no LangGraph required)

For operations that are long-running or expensive, but whose steps are **known and fixed in advance** — the code decides what happens next, not the model:

```
Frontend
   ↓
Hono
   ↓
BullMQ
   ↓
AI Worker
   ↓
AI Service (one or more calls, sequenced by plain code)
   ↓
Result
```

Examples:

- **AI Project Kickoff** — one structured-output call (context → generate → validate), wrapped in a job for retries/backoff. Implemented as a single tool-calling request, not a graph.
- **Project Health** — one synthesis call over data the application already knows how to fetch (tasks, milestones, deadlines, artifact/knowledge status). The application decides what to read; the model doesn't need to.
- **Artifact generation (current scope: single markdown deliverable)** — gather context → one generation call → validate → save version.

These stay in this category as long as the sequence of steps is fixed by the application. If artifact generation later needs a stage to conditionally loop back (e.g. a generated outline fails a quality check and needs re-planning, not just a retry of the same step), that specific workflow moves to the next category — the rest don't automatically follow.

## Agentic AI Workflows (LangGraph)

For workflows where the **model itself decides what to do next**, in a way the application cannot predetermine as an if/else — genuine dynamic branching, not just "several steps."

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
AI Provider
   ↓
Result
```

Current candidate:

- **Research workflow** — if built so the AI decides, based on what it's already found, whether to keep searching, change approach, or stop. This is the one workflow in Nexus where the branching is genuinely data-dependent at runtime.

Not yet built. Before reaching for LangGraph even here: a plain bounded loop (fixed max iterations, coded as regular control flow) may be sufficient — escalate to LangGraph only if that loop's branching logic becomes hard to manage as plain code, not by default.

---

# 10. LangGraph

LangGraph is for workflows where **the model's own output determines control flow** — not for workflows that merely have multiple steps, persisted state, or a human-approval gate. Those three, specifically, are usually _not_ reasons to reach for it on their own:

- **Multiple steps** — a sequence of AI Service calls inside a worker function is still just a sequence; LangGraph doesn't simplify a fixed sequence, it adds a framework layer around one.
- **State / persistence** — an `ai_runs` row (or equivalent) already gives you a durable record of a workflow's progress and result. That's a database concern, not a reason for a graph framework.
- **Human approval** — approval is an application-layer gate (a stored draft + an explicit commit/accept endpoint), not a step inside the AI's own reasoning. It happens _after_ the AI's output, in Nexus's domain services — the AI never needs to "know" approval is part of its workflow.

The actual bar: does the model need to choose what happens next based on what it's already produced or found, in a way the application genuinely cannot express as an if/else ahead of time? Only that clears the bar. As of now, only a genuinely agentic Research workflow (Section 9) meets it — everything else in Nexus achieves "multi-step, stateful, human-approved" using plain sequential code, a database row, and an application-layer approval gate.

---

# 11. AI Project Kickoff

AI Project Kickoff is the first major AI workflow in Nexus, and the first one actually implemented.

### Input

```
Project Name
Goal
Category
Level (beginner | intermediate | advanced)
Deliverable intent
Deliverables (preset or custom, multi-select)
Knowledge sources (optional — files/links/YouTube/text)
```

### Process

```
Project Goal + Category + Level + Deliverables
      ↓
Retrieve Relevant Knowledge Context (floor-and-fill)
      ↓
Build Prompt (base + category guidance + level guidance + deliverable guidance)
      ↓
Generate (single structured tool-calling request)
      ↓
Validate (Zod)
      ↓
Store as Draft
      ↓
Present to User for Review
```

### Output

```
Project Summary

Milestones[]
  Tasks[]
    instructions: string[]  — ordered, concrete steps per task
```

### Important

AI does **not** automatically create the real project structure.

```
AI Generates Draft
     ↓
User Reviews (edits titles, removes/adds tasks)
     ↓
User Approves (explicit commit action)
     ↓
Application Creates Milestone/Task rows
```

**Implementation note:** this workflow does not use LangGraph. It's a single forced tool-calling request (context → one generation call → Zod validation), run inside a BullMQ job for retries/idempotency. The draft/approve boundary is enforced by having exactly one code path — the commit endpoint — permitted to write real `Milestone`/`Task` rows; nothing about that boundary requires a workflow framework.

---

# 12. AI Planner Intelligence

AI's role in the Planner is **recommendation**, not ownership.

AI can analyze:

- Current progress
- Tasks
- Milestones
- Deadlines
- Dependencies
- Project health

And suggest:

> "This milestone has three remaining tasks."

> "This task appears to be blocking the next milestone."

> "You may want to work on the research task before creating the presentation."

AI should not silently:

- Reorder tasks
- Change deadlines
- Complete tasks
- Create arbitrary project state

unless the user explicitly approves the action.

# 13. AI Project Health

Project Health is another AI workflow.

```
Project
   │
   ├── Tasks
   ├── Milestones
   ├── Deadlines
   ├── Knowledge
   ├── Artifacts
   └── Activity
          ↓
       AI Analysis
          ↓
     Project Health
          ↓
      Suggestions
```

Example:

```
Project Health
────────────────

ON TRACK

✓ Research completed
✓ Proposal completed

⚠ Presentation missing
⚠ Milestone due in 3 days

Suggested Next Step:
Create the presentation from the completed report.
```

The AI is identifying useful information.

The user remains in control.

**Implementation note:** the application already knows which data sources a health check needs (tasks, milestones, deadlines, artifact/knowledge status) — the model isn't being asked to decide what's relevant, only to synthesize what's already been fetched. This is a single synthesis call, not a LangGraph workflow.

---

# 14. AI Artifact Generation

Artifacts are one of the most important AI capabilities in Nexus.

The architecture should separate:

**AI reasoning** from **file generation**.

```
User Request
     ↓
AI
     ↓
Artifact Specification
     ↓
Validation
     ↓
Artifact Generator
     ↓
File
     ↓
Object Storage
     ↓
Artifact Record
```

For example:

```
AI
 ↓
Presentation Structure
 ↓
Slides[]
 ↓
PPTX Generator
 ↓
presentation.pptx
```

This is much more reliable than asking an LLM to directly produce a binary file.

**Implementation note:** current scope is a single markdown deliverable — one generation call, no orchestration framework needed. As deliverable formats expand (per the `deliverable_kind` presets — word report, financial model, presentation, timeline, spreadsheet), most of these still fit "gather context → one generation call → hand structured content to the matching file generator" as plain sequential code. LangGraph is only justified for a specific artifact type if its generation needs a genuine re-plan loop (e.g. a generated structure fails validation in a way that calls for reasoning about _why_, not just retrying) — decide per artifact type when it's built, not as a blanket rule for "artifact generation."

---

# 15. AI + Knowledge / RAG

RAG allows Nexus to use the user's actual knowledge.

```
Documents
    ↓
Extraction
    ↓
Chunking
    ↓
Embeddings
    ↓
pgvector
```

When the user asks something:

```
Question
   ↓
Embedding
   ↓
Vector Search
   ↓
Relevant Knowledge
   ↓
Context Builder
   ↓
LLM
   ↓
Answer
```

Knowledge should be filtered by project/workspace permissions.

AI must never retrieve knowledge from another user's workspace.

---

# 16. AI Tool Layer

As Nexus becomes more capable, AI can interact with controlled application tools.

Examples:

```
AI Tools

read_project()
read_tasks()
search_knowledge()
read_artifact()

suggest_task()
suggest_milestone()
suggest_artifact()

generate_artifact()
```

Tools should go through the application's service layer.

Avoid giving AI direct database access.

```
❌ AI → PostgreSQL

✅ AI → Tool → Application Service → Database
```

This keeps authorization, validation and business rules outside the model.

---

# 17. AI Permission Model

This is one of the most important architectural boundaries.

## READ

AI can read:

- Project
- Tasks
- Knowledge
- Artifacts
- Conversations
- Calendar

---

## SUGGEST

AI can suggest:

- Tasks
- Milestones
- Deliverables
- Schedule changes
- Artifact generation
- Next actions

---

## EXECUTE

Meaningful mutations require:

```
AI Suggestion
      ↓
User Approval
      ↓
Application Service
      ↓
Validation
      ↓
Database
```

This creates a safe human-in-the-loop architecture.

---

# 18. AI Memory

Nexus has two different concepts that should not be confused.

## Workspace Memory

Persistent information:

- Documents
- Knowledge
- Artifacts
- Project information
- Important decisions

---

## Conversation Memory

Short/medium-term context:

- Previous messages
- Current conversation
- Recent AI interactions

Conversation history should not automatically become permanent knowledge.

Only meaningful information should become reusable workspace knowledge.

---

# 19. AI Streaming

For interactive AI experiences:

```
User
 ↓
Hono
 ↓
AI Provider
 ↓
Streaming
 ↓
Frontend
```

Use streaming for:

- Chat
- Writing assistance
- AI explanations
- Research progress where appropriate

For long-running background workflows:

```
Request
 ↓
BullMQ
 ↓
Worker
 ↓
Status
 ↓
Notification
```

Example:

```
Generating presentation...

Processing...
      ↓
Researching...
      ↓
Generating slides...
      ↓
Finalizing...
      ↓
Artifact Ready
```

---

# 20. Background AI Jobs

Use BullMQ + Redis for operations that shouldn't block HTTP requests. Most of these are plain sequential logic inside the worker (see Section 9) — only a workflow with genuine dynamic branching (currently: research, if/when built that way) routes through LangGraph specifically.

```
AI Jobs

kickoff-generate        (plain sequential — implemented)
artifact-generation     (plain sequential, current scope)
knowledge-processing    (extraction/chunking/embedding — not an AI reasoning step)
embedding-generation
ocr-processing
research                (candidate for LangGraph, if built as dynamic tool-use)
project-health          (plain sequential)
notifications
```

Example — kickoff, as implemented:

```
User
 ↓
Create Project / Continue Kickoff
 ↓
API
 ↓
BullMQ
 ↓
AI Worker
 ↓
AI Service (single structured call)
 ↓
Draft Stored
 ↓
SSE → Frontend Review
```

---

# 21. AI Error Handling

AI failures are expected.

The system should handle:

- Provider timeout
- Rate limits
- Invalid structured output
- Model errors
- Tool failures
- Retrieval failures
- Worker failures
- Artifact generation failures

Use:

```
LLM
 ↓
Validation
 ↓
Retry if appropriate
 ↓
Fallback if available
 ↓
Fail gracefully
```

Do not endlessly retry invalid AI output.

**Implementation note:** Zod validation failing on a structured-output call is itself a legitimate retry trigger, not just a hard failure — a job's normal retry/backoff (BullMQ `attempts` + exponential backoff) naturally re-runs generation when the model returns output that fails schema validation. Bound this the same as any other retry — don't let a persistently invalid response spin indefinitely.

---

# 22. AI Observability

Track AI separately from normal API traffic.

Important metrics:

### Performance

- AI latency
- Time to first token
- Workflow duration

### Reliability

- AI failures
- Invalid structured output
- Tool failures
- Workflow failures

### Cost

- Tokens
- Model usage
- Cost per workflow
- Cost per user
- Cost per artifact

### Product

- AI Kickoff acceptance rate
- AI suggestion acceptance rate
- Artifact generation success rate
- AI feature usage

This will eventually help determine which models are actually worth paying for.

---

# 23. AI Security

AI must respect the same authorization boundaries as the rest of Nexus.

### Requirements

- Workspace isolation
- Project isolation
- Knowledge access control
- Artifact access control
- Tool authorization
- Input validation
- Output validation
- Prompt injection protection
- File validation
- Rate limiting

Especially for RAG:

```
User A
 ↓
Project A
 ↓
Knowledge A
```

must never accidentally retrieve:

```
Knowledge B
```

---

# 24. Prompt Architecture

Don't scatter prompts throughout controllers and services.

Use a dedicated structure:

```
ai/
├── prompts/
│   ├── project-kickoff.ts
│   ├── project-health.ts
│   ├── artifact-generation.ts
│   ├── project-chat.ts
│   └── task-assistant.ts
│
├── workflows/
├── tools/
├── providers/
└── schemas/
```

Prompts should be versioned and treated as application code.

---

# 25. AI Architecture in the Backend

The backend relationship should look like:

```
modules/
│
├── ai/
│   ├── providers/
│   ├── workflows/
│   ├── prompts/
│   ├── tools/
│   ├── schemas/
│   └── services/
│
├── projects/
├── planner/
├── tasks/
├── knowledge/
├── artifacts/
└── notifications/
```

AI should **orchestrate existing domain services**, not replace them.

For example:

```
AI Tool
   ↓
Task Service
   ↓
Task Repository
   ↓
PostgreSQL
```

not:

```
AI
 ↓
SQL
```

---

# 26. End-to-End AI Architecture

Putting everything together:

```
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Next.js UI      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Hono API       │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     ▼              ▼              ▼
                AI Service     Domain Services   BullMQ
                     │              │              │
                     ▼              │              ▼
               Context Builder      │          AI Worker
                     │              │              │
          ┌──────────┼──────────┐   │      ┌───────┴───────┐
          │          │          │   │      │               │
          ▼          ▼          ▼   │      ▼               ▼
       Project    Knowledge   Artifacts    AI Provider   LangGraph
          │          │          │    │   (plain sequential  (agentic
          │          ▼          │    │    workflows —        workflows —
          │       pgvector      │    │    kickoff, health,    research,
          │                     │    │    artifact gen)       if built)
          └──────────┬──────────┘    │         │               │
                     │                └─────────┴───────┬───────┘
                     ▼                                  ▼
               Context + Tools                    AI Provider
                     │                                  │
                     ▼                                  ▼
                    AI  ◄─────────────────────────── LLM
                     │
             ┌───────┴────────┐
             ▼                ▼
         Suggestion         Artifact
             │                │
             ▼                ▼
        User Approval      Generator
             │                │
             └───────┬────────┘
                     ▼
              Domain Services
                     │
                     ▼
                PostgreSQL
```

---

# 27. AI Architecture Principles

### 1. Context First

AI quality depends heavily on the quality of project context.

### 2. Structured Output

Never trust arbitrary model output as application state.

### 3. AI Suggests, Application Executes

Business logic belongs in Nexus, not the model.

### 4. Human-in-the-Loop

Important mutations should require user approval.

### 5. Provider Agnostic

Models should be replaceable.

### 6. Use the Right Tool for the Job

Simple AI → direct provider call.

Multi-step but deterministic AI (the sequence is known in advance) → plain sequential logic in a worker, no framework required.

Genuinely dynamic, model-decided branching → LangGraph.

Long-running work → BullMQ, regardless of which of the above applies.

Knowledge retrieval → pgvector.

### 7. AI Should Produce Work

The goal isn't more chat.

The goal is:

> **Projects → Work → Deliverables → Completion.**

### 8. Cost Is an Architectural Concern

Use inexpensive models for simple operations and stronger models only where reasoning quality matters.

---

# 28. The Nexus AI Loop

The entire architecture ultimately supports this:

```
                PROJECT
                   │
                   ▼
                CONTEXT
                   │
                   ▼
                REASON
                   │
                   ▼
               SUGGEST
                   │
                   ▼
             USER APPROVAL
                   │
                   ▼
                EXECUTE
                   │
                   ▼
               DELIVERABLE
                   │
                   ▼
                MEMORY
                   │
                   ▼
             PROJECT PROGRESS
                   │
                   └──────────► REASON AGAIN
```

> **Nexus AI should not exist to make the chatbot smarter. It exists to make the user's project move forward.**

This is the main distinction I'd preserve between the **AI Architecture** and the FE/BE architecture: the FE defines _how users interact_, the BE defines _how the system is implemented_, and the AI architecture defines _how Nexus understands context, reasons, suggests, and helps execute meaningful work_.
