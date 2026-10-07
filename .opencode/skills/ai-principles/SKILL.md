---
name: ai-principles
description: Use when touching apps/api/src/ai, AI providers, prompts, structured output, workflows, or anything that calls an LLM.
---

Full architecture lives in `docs/ai-architecture.md` — read it before implementing a new AI workflow. These are the non-negotiable rules that apply to every AI call in this codebase:

- **Context-first**: build per-request context from the actual project/task/knowledge data. Never dump the whole workspace into a prompt because it's easier than being selective.
- **Structured output only**: `LLM → Zod schema → application logic`. Never `LLM → database` and never `LLM → application state` without a validation gate in between. Prefer provider-native structured output — forced tool-calling against a Zod-derived JSON schema (`z.toJSONSchema()`) — over prompting for prose-formatted JSON. One schema drives both the tool definition and the post-generation validation, so they can't drift apart.
- **Provider abstraction**: route every model call through the existing `AIProvider` interface and `modelForTask()` — never instantiate a provider SDK client directly inside a domain module. If you're about to add a new AI-driven module and find yourself reaching for an SDK client inline, that's a gap to close first, not a shortcut to take.
- **Human-in-the-loop**: AI suggests, the user approves, Nexus executes through its normal service layer. No AI-initiated mutation skips approval, regardless of how confident the output looks. Approval is an application-layer gate (stored draft + explicit commit endpoint) — it's not a step inside the AI's own reasoning, so it never needs special workflow-framework support.
- **Right tool for the job — three tiers, not two**:
  - _Simple_ (one synchronous call, user is waiting — rewrite, summarize, chat) → call the provider directly, stream the response.
  - _Multi-step but deterministic_ (the sequence of calls is fixed by the code, not decided by the model — Kickoff, Project Health, current-scope artifact generation) → plain sequential logic inside a BullMQ worker. No framework needed just because there's more than one call.
  - _Agentic_ (the model itself decides what happens next in a way the app genuinely can't express as if/else ahead of time) → LangGraph. As of now, only a dynamically-branching Research workflow would qualify, and it's not yet built — don't reach for LangGraph by default on a new multi-step workflow; check it actually needs runtime, model-decided branching first.
- **Retries on invalid output**: a Zod validation failure on a structured-output call is a legitimate retry trigger, not just a hard failure — let the job's normal BullMQ `attempts`/backoff re-run generation. Bound it like any other retry; don't let a persistently invalid response spin indefinitely.
