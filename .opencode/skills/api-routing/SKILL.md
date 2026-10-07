---
name: api-routing
description: Use when creating or editing Hono route files in apps/api.
---

- Do not separate code when it doesn't need to be shared. Route files are self-contained: keep params, request/response schemas, and error responses written inline where they're used inside `createRoute`. Don't extract them into module-level `const`s or a `shared.ts` unless they're genuinely reused across different modules — "might be reused later" doesn't count.
- Handlers build their response object inline; don't extract placeholder/response helpers.
- Only move code into a shared location once it's actually reused in more than one place.
- Name id fields for their entity, never a generic `ids`: `projectId`, `deliverableIds`, `sourceId`, `milestoneId`, etc. Applies to schemas, request payloads, and variables alike.
- **User-facing copy**: route `description` fields and any error/notification message surfaced in the app are user-facing. Write them as plain, human-readable English (`'Conversation created'`, `'Project not found'`) — never internal type/tech names (`'ConversationType created'`) or `Type`-suffixed identifiers. If running an automated rename/refactor on types, exclude these string literals — a type rename must never rewrite user-facing copy.
