# Nexus

## Development workflow

- Work incrementally: implement one logical step, verify it, then stop. Do not execute a feature end-to-end in a single pass unless explicitly asked.
- Understand before implementing: read the relevant code, identify what is known vs. unknown, and surface assumptions before writing code.
- Break large tasks into small steps (data model → API → validation → frontend) and validate each step before continuing.
- Ask before deciding when there are multiple reasonable approaches, or when the change affects the database schema, public API contracts, auth, dependencies, or existing architecture decisions.
- Validate a step (report what changed and what was verified), then stop and wait. Do not auto-continue to the next phase or do unrelated improvements.
- Minimize assumptions: do not silently invent fields, endpoints, UI behavior, auth rules, error semantics, or naming. Follow existing conventions for trivial choices.
- Inspect existing code before creating new abstractions: reuse existing schemas, types, utilities, and route patterns rather than adding new ones.
- Keep changes small enough to review easily (1-3 files per step).

## Routing rules

- Do not separate code when it does not need to be shared.
- Route files are self-contained: keep params, request/response schemas, and error responses written inline where they are used inside `createRoute`. Do not extract them into module-level `const`s or a `shared.ts` unless they are genuinely reused across different modules.
- Handlers build their response object inline; do not extract placeholder/response helpers.
- Only separate code into a shared location when it is reused in more than one place.
