# Frontend Architecture

> **Framework:** Next.js + React + TypeScript
>
> **UI:** Tailwind CSS + shadcn/ui
>
> **Server State:** TanStack Query
>
> **Client State:** Zustand
>
> **Forms:** React Hook Form + Zod
>
> **Realtime:** SSE / WebSocket
>
> **Architecture:** Feature-oriented modular frontend

---

# 1. Architecture Overview

Nexus is a **project-centered frontend**.

The application is built around four major layers:

```
                         Nexus Frontend
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
       Application       Workspace        Intelligence
           Shell            Layer             Layer
             │                │                │
             │                │                ├── AI
             │                │                ├── Search
             │                │                └── Suggestions
             │                │
             │                ├── Global Workspace
             │                │
             │                └── Project Workspace
             │
             └────────────────┬────────────────┘
                              │
                              ▼
                       Data / API Layer
                              │
                              ▼
                         Hono Backend
```

The mental model is:

> **Shell → Workspace → Intelligence → Data**

---

# 2. Application Shell

The shell provides the persistent application structure.

```
App Shell
│
├── Sidebar
├── Topbar
├── Command Palette
├── Search
├── Notifications
└── Main Content
```

The sidebar provides global navigation:

```
Home
Projects
Planner
Artifacts
Knowledge
Calendar
Notifications
Settings
```

The shell should remain consistent while the user moves between projects and global pages.

---

# 3. Workspace Architecture

The workspace is divided into **Global Workspace** and **Project Workspace**.

```
Workspace
│
├── Global
│   ├── Projects
│   ├── Planner
│   ├── Artifacts
│   ├── Knowledge
│   └── Calendar
│
└── Project
    ├── Overview
    ├── Planner
    ├── Knowledge
    ├── Artifacts
    └── Activity
```

### Global Workspace

Answers:

> **"What's happening across all my work?"**

For example, Global Planner aggregates important work from multiple projects.

### Project Workspace

Answers:

> **"What am I doing inside this project?"**

The project is the primary context for:

- Knowledge
- Planning
- Artifacts
- Activity
- AI

---

# 4. Project Experience

The project is the heart of the frontend.

```
                     Project
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
   Overview          Planner         Knowledge
       │                │                │
       ▼                ▼                ▼
  Project state      Journey          Sources
  Resume Working     Milestones       Files
  Progress           Tasks            Research
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
                    Artifacts
                        │
                        ▼
                    Activity
```

### Overview

The Overview acts as the project's:

> **README + cockpit**

It contains:

- Project goal
- Current progress
- Resume Working
- Current milestone
- Planner snapshot
- Recent artifacts
- Knowledge snapshot
- Recent activity

It gives users enough context without requiring them to open every tab.

---

# 5. Planner & Resume Working

Planner manages the project's journey:

```
Journey
   │
   ├── Milestones
   │
   └── Tasks
```

Example:

```
Research ✓
     ↓
Analysis ●
     ├── Review interviews ✓
     ├── Verify pricing ← Current
     └── Complete SWOT
     ↓
Final Report
     ↓
Presentation
```

The key UX is **Resume Working**.

Instead of asking users:

> "What should I do?"

Nexus can bring them back to their last meaningful checkpoint.

```
Resume Working
      ↓
Current Milestone
      ↓
Current Task
      ↓
Task Preview
      ↓
Task Session
```

The task preview can show:

- Objective
- Related knowledge
- Related artifacts
- Why the task matters

Then the user decides whether to start.

---

# 6. Knowledge & Artifacts

These two are closely related and should be treated as the project's **inputs and outputs**.

```
Knowledge
   │
   │ informs
   ▼
Work
   │
   │ produces
   ▼
Artifacts
```

### Knowledge

Contains:

- PDFs
- DOCX
- Markdown
- TXT
- CSV
- Images
- Research
- Notes

Files move through:

```
Uploading
    ↓
Processing
    ↓
Indexing
    ↓
Ready
```

### Artifacts

Contains:

- Reports
- Presentations
- Spreadsheets
- Proposals
- PDFs
- Timelines

Artifacts support:

- Preview
- Edit
- Versions
- Regenerate
- Download

Different artifact types can have different editors.

---

# 7. AI & Intelligence Layer

AI is **not another section of the application**.

It is a shared capability across the workspace.

```
                    AI
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
    Project       Knowledge      Artifact
       │             │             │
       ▼             ▼             ▼
   Understand      Analyze       Generate
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  Planner
                     │
                     ▼
                Suggestions
```

AI can:

- Understand project context
- Analyze knowledge
- Answer questions
- Suggest actions
- Generate artifacts
- Review work
- Identify project-health issues

But:

> **AI assists; the user remains in control.**

For example, AI may suggest a task, but it doesn't automatically create or schedule it.

---

# 8. Context-Aware AI

The frontend passes context based on where the user is.

```
Project AI
    → Project context

Knowledge AI
    → Selected documents

Artifact AI
    → Current artifact

Task AI
    → Current task + related context

Global AI
    → Workspace context
```

A shared context model can look like:

```
typeAIContext= {
  projectId?:string;
  taskId?:string;
  artifactId?:string;
  knowledgeIds?:string[];
};
```

This lets us maintain **one AI system** while giving it different context depending on the user's location.

---

# 9. Data & State Architecture

Keep state management simple by separating three types of state:

```
Frontend State
│
├── Server State → TanStack Query
├── Client State → Zustand
└── Local UI State → React
```

### Server State

Backend-owned data:

- Projects
- Tasks
- Artifacts
- Knowledge
- Activity
- Notifications
- Calendar events

Use **TanStack Query**.

### Client State

Cross-application state:

- Sidebar state
- AI session
- Workspace context
- User preferences

Use **Zustand**.

### Local State

Component-specific state:

- Modal open/close
- Selected tab
- Form values
- Dropdown state

Use React state.

---

# 10. Data Flow

Most requests follow a simple path:

```
React Component
      ↓
TanStack Query
      ↓
API Client
      ↓
Hono API
      ↓
Backend Module
      ↓
Database
```

For long-running operations:

```
User
 ↓
API
 ↓
Background Job
 ↓
Worker
 ↓
SSE / WebSocket
 ↓
Frontend
```

This is especially useful for:

- AI generation
- Artifact generation
- File processing
- Notifications

---

# 11. Frontend Module Structure

Instead of separating everything into generic folders like:

```
components/
hooks/
services/
utils/
```

Nexus should use **feature-oriented modules**.

```
src/
│
├── app/
│
├── features/
│   ├── projects/
│   ├── planner/
│   ├── knowledge/
│   ├── artifacts/
│   ├── calendar/
│   ├── notifications/
│   ├── search/
│   └── ai/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   ├── realtime/
│   └── uploads/
│
├── stores/
│
└── types/
```

Each feature owns its own:

```
feature/
├── components/
├── hooks/
├── api/
├── types/
└── schemas/
```

For example:

```
features/planner/

├── components/
│   ├── journey.tsx
│   ├── milestone.tsx
│   ├── task-card.tsx
│   └── task-preview.tsx
│
├── hooks/
├── api/
├── types/
└── schemas/
```

This keeps related code together.

---

# 12. Routing

The routing should reflect the two workspace levels:

```
app/

├── (auth)/
│   ├── login/
│   └── register/
│
├── (workspace)/
│   ├── home/
│   ├── projects/
│   ├── planner/
│   ├── artifacts/
│   ├── knowledge/
│   ├── calendar/
│   └── notifications/
│
└── projects/
    └── [projectId]/
        ├── page.tsx
        ├── planner/
        ├── knowledge/
        ├── artifacts/
        └── activity/
```

This maps cleanly to the product:

```
Global
   ↓
/planner

Project
   ↓
/projects/:id/planner
```

---

# 13. Key UX Flow

The frontend ultimately supports one continuous experience:

```
Create Project
      ↓
AI Kickoff
      ↓
Review Project Structure
      ↓
Project Overview
      ↓
Resume Working
      ↓
Task Preview
      ↓
Task Session
      ↓
Knowledge / Research
      ↓
Create Artifact
      ↓
Complete Milestone
      ↓
Journey Progress
      ↓
Resume Later
```

This is the **core frontend experience of Nexus**.

---

# 14. Performance & UX

The frontend should prioritize feeling fast.

Key techniques:

```
Server Components
       +
TanStack Query Cache
       +
Optimistic Updates
       +
Streaming AI
       +
Lazy Loading
       +
Pagination / Virtualization
       +
Background Processing
```

Different operations should have different UX states:

```
Normal data
→ Loading / Loaded

AI
→ Streaming

File
→ Uploading → Processing → Ready

Artifact
→ Generating → Ready
```

The user should always understand **what Nexus is doing**.

---

# Final Architecture

If we strip everything down to the core, the frontend architecture becomes:

```
                         NEXUS
                           │
                           ▼
                    Application Shell
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      Global Workspace             Project Workspace
             │                           │
     ┌───────┼───────┐           ┌───────┼────────┐
     ▼       ▼       ▼           ▼       ▼        ▼
  Planner Artifacts Knowledge  Overview Planner Knowledge
                                    │       │        │
                                    └───────┼────────┘
                                            ▼
                                         Artifacts
                                            │
                                            ▼
                                         Activity
                                            │
                                            ▼
                                    Intelligence Layer
                                            │
                               ┌────────────┼────────────┐
                               ▼            ▼            ▼
                              AI         Search      Suggestions
                               │
                               ▼
                         Data / API Layer
                               │
                               ▼
                           Hono API
```
