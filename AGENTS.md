# Nexus

## Routing rules

- Do not separate code when it does not need to be shared.
- Route files are self-contained: keep params, request/response schemas, and error responses written inline where they are used inside `createRoute`. Do not extract them into module-level `const`s or a `shared.ts` unless they are genuinely reused across different modules.
- Handlers build their response object inline; do not extract placeholder/response helpers.
- Only separate code into a shared location when it is reused in more than one place.