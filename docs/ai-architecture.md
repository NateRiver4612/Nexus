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
     Tasks              LangGraph         Analysis
     Artifacts          Structured AI     Planning
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

---

# 9. AI Workflow Architecture

Nexus will have two types of AI operations.

## Simple AI Operations

For short operations:

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

These do **not** need LangGraph.

---

## Complex AI Workflows

For multi-step operations:

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

Examples:

- AI Project Kickoff
- Research workflow
- Large document analysis
- Artifact generation
- Project health analysis

---

# 10. LangGraph

LangGraph is used for **stateful AI workflows**, not every AI request.

A workflow can look like:

```
START
  ↓
Load Context
  ↓
Analyze
  ↓
Generate
  ↓
Validate
  ↓
Human Review
  ↓
Execute
  ↓
END
```

This is useful when AI needs:

- Multiple steps
- State
- Persistence
- Human approval
- Tool usage
- Retry/resume behavior

---

# 11. AI Project Kickoff

AI Project Kickoff is the first major AI workflow in Nexus.

### Input

```
Project Name
Goal
Description
```

### Process

```
Project Goal
      ↓
Load Relevant Context
      ↓
Analyze Goal
      ↓
Generate Deliverables
      ↓
Generate Milestones
      ↓
Generate Tasks
      ↓
Validate Structure
      ↓
Present to User
```

### Output

```
Project Summary

Suggested Deliverables
Suggested Milestones
Suggested Tasks
```

### Important

AI does **not** automatically create them.

```
AI Suggests
     ↓
User Reviews
     ↓
User Accepts
     ↓
Application Creates
```

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

Use BullMQ + Redis for operations that shouldn't block HTTP requests.

```
AI Jobs

artifact-generation
knowledge-processing
embedding-generation
ocr-processing
research
project-health
notifications
```

Example:

```
User
 ↓
Generate Report
 ↓
API
 ↓
BullMQ
 ↓
AI Worker
 ↓
LangGraph
 ↓
Artifact Generator
 ↓
S3
 ↓
Artifact Ready
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
          ┌──────────┼──────────┐   │              ▼
          │          │          │   │         LangGraph
          ▼          ▼          ▼   │              │
       Project    Knowledge   Artifacts            ▼
          │          │          │            AI Provider
          │          ▼          │                 │
          │       pgvector      │                 ▼
          │                     │              LLM
          └──────────┬──────────┘
                     │
                     ▼
               Context + Tools
                     │
                     ▼
                    AI
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

Simple AI → direct provider.

Complex AI → LangGraph.

Long-running work → BullMQ.

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
