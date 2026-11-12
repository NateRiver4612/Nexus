# Troubleshooting

Running notes on bugs we've hit and how they were diagnosed and fixed. Add a new `##` section per area as we go.

## AI Integration → create_artifact

### Symptom

`create_artifact` never produced an artifact. Depending on the run you'd see raw markup in
the chat, only read tools running, a tool error, or the stream dropping mid-generation — all
with no artifact card.

### Root causes (in the order we hit them) & fixes

1. **DSML leaked as text** — DeepSeek V4 is supposed to stream tool calls in `delta.tool_calls`,
   but some streams leak the call as DSML markup inside `content` (`<｜14731｜tool_calls>…`) — a
   provider-side parser/routing defect, not an alternate wire format. It only surfaced on
   `create_artifact` because Pro plus a large `content` argument is the condition that triggers
   it. The provider only read `delta.tool_calls`, so the markup streamed through as text and the
   tool never ran.
   - Fix: `apps/api/src/modules/ai/providers/deepseek/dsml.ts` (parser + streaming sieve),
     wired into `streamChat` in `providers/deepseek/index.ts`; structured calls still win.
   - Observability: `streamChat` logs a warning (model + recovered call count) when the DSML
     fallback fires, so a provider-side rise in leaks is visible.
   - Verify: unit `apps/api/src/modules/ai/__tests__/chat/deepseek/dsml.test.ts`; live
     large-tool-call regression (Pro) in `live.test.ts` under `LIVE_AI=1`.

2. **Model never called it / hallucinated a save** — it over-researched, burned all
   tool-enabled iterations (`MAX_ITERATIONS = 5`), and the final tool-less pass narrated a
   fake "I saved …" instead of creating.
   - Fix: prompt hardening in `ai/prompts/projectChat.ts` (create directly, never claim an
     un-run save, never ask "shall I save?"), `MAX_ITERATIONS` 5→8 in
     `ai/chat/runChatLoop.ts`, and `project-chat` model `deepseek-v4-flash`→`deepseek-v4-pro`
     in `lib/client.ts`.

3. **`create_artifact` ran but threw `CredentialsProviderError: Your session has expired`** —
   no static S3 keys in `.env`, so `getS3Client()` (`src/storage.ts`) used the AWS default
   credential chain, which resolved to an expired SSO/OAuth session.
   - Fix: local **MinIO** (compose services + `.env` S3 vars) or long-lived static IAM keys;
     restart the API.

4. **`idleTimeout` right after generation** — the DSML sieve buffers the whole tool call
   (including the large content) and emits nothing, so the SSE connection went silent and
   Bun's default idle timeout closed it.
   - Fix: `Bun.serve({ idleTimeout: 255 })` in `src/index.ts` + SSE `: keep-alive` comments
     every 15s in `ai/routes/postMessage.ts`.

### Red herrings (already ruled out — don't re-check)

- Tool not registered? It was (`ai/tools/registry.ts`).
- Bad tool JSON schema? Valid — verified `z.toJSONSchema` output for every tool.
- Wrong param names (`title`/`markdown`)? Recoverable — the loop feeds "Invalid arguments"
  back to the model.

### Verify

- `bun run --filter=@nexus/api typecheck` and `bun run --filter=@nexus/web typecheck`
- `bun test src/modules/ai/__tests__/chat/deepseek`
- Migration `0028` applied (`artifact_type` gained `code`)
- Manual: ask for a `.md` → "Creating artifact…" + skeleton card → card → panel opens.

### Demo-only timing hacks (can mask / alter the timing of this bug)

- `MIN_CREATE_MS` (3s) in `ai/tools/createArtifact.ts`
- `MIN_STAGE_MS` (2s) in `ai/chat/runChatLoop.ts`

### Still open / risks

- Tool-result round-trip: results are fed back as `role: 'tool'`; some backends expect
  `<tool_result>` in a user message — needs a live check.
- Weak/flash models may still under-call `create_artifact` or pick wrong params.
- DSML is a provider defect, not a format: don't build on it. Treat the sieve as best-effort
  recovery and watch the `[deepseek] … recovered … from DSML` warning for recurrence.
