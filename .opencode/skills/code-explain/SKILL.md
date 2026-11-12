---
name: code-explain
description: Use when writing or improving explanatory comments for parser, transform, mapping, serializer, or chunking code. Documents the input and output shapes plus a small real example so the file is understood from its contract, not by tracing every branch.
---

# Code Explain

For a file or function with a lot of transformation logic, the reader should understand it from the
contract: what goes in, what comes out, and one concrete example. Put that at the top so nobody has
to reverse-engineer the branches.

## Pattern

Put this above the main function — or at the top of the file when several functions form one
transform:

```ts
/**
 * <One line: what this turns X into Y.>
 *
 * Input:
 *   <exact shape of the input — the fields a caller/consumer sees>
 *
 * Output:
 *   <exact shape of the output>
 *
 * Example:
 *   in:  <small, realistic input>
 *   out: <what the function returns for it>
 *
 * Notes:
 *   - <only behavior the reader cannot infer: coercion, fallback, ordering, best-effort>
 */
```

For a tricky helper inside the file, use a short `@example` instead of repeating the whole header.

## Rules

- **Use real names.** No `x`, `foo`, `n`, `data`, or `item`. If the code handles `search_knowledge`,
  write `search_knowledge`; if the field is `taskId`, write `taskId`. Placeholder names defeat the
  point.
- **Shapes first, example second.** The `Input`/`Output` shapes are the contract; the example is proof
  that the shapes are real.
- **One small example beats a complete one.** Show the interesting case — coercion, a split chunk, an
  optional field — not the happy path that teaches nothing.
- **Notes only for non-obvious behavior.** Say why a fallback exists, what `string="false"` means, or
  that order is preserved. Do not restate self-describing code.
- **Streaming/buffered transforms** show input as ordered chunks and output as one object per call,
  plus any final flush:

  ```ts
  /**
   * Input (chunks, in order):
   *   1. "..."
   *   2. "..."
   *
   * Output (per push, then flush):
   *   push(1) → { ... }
   *   push(2) → { ... }
   *   flush() → { ... }
   */
  ```
- Keep the header about the contract. Inline `//` comments stay next to the decision they explain.

## Example — JSON transform

```ts
/**
 * Flattens ordered line items into a per-order summary.
 *
 * Input:
 *   { "id": "o1", "items": [{ "name": "pen", "qty": 2 }, { "name": "pad", "qty": 1 }] }
 *
 * Output:
 *   { "id": "o1", "total": 3, "names": ["pen", "pad"] }
 *
 * Example:
 *   in:  { "id": "o1", "items": [{ "name": "pen", "qty": 2 }, { "name": "pad", "qty": 1 }] }
 *   out: { "id": "o1", "total": 3, "names": ["pen", "pad"] }
 *
 * Notes:
 *   - Item order is preserved in `names`.
 */
```

## Example — parser (string → object[])

```ts
/**
 * Parses DeepSeek DSML tool-call markup out of a streamed `content` string.
 *
 * Input:
 *   "<｜14731｜tool_calls>
 *      <｜14731｜invoke name=\"search_knowledge\">
 *        <｜14731｜parameter name=\"limit\" string=\"false\">5</｜14731｜parameter>
 *      </｜14731｜invoke>
 *    </｜14731｜tool_calls>"
 *
 * Output:
 *   [{ "name": "search_knowledge", "args": { "limit": 5 } }]
 *
 * Example:
 *   in:  "<…parameter name=\"limit\" string=\"false\">5</…parameter>"
 *   out: [{ "name": "search_knowledge", "args": { "limit": 5 } }]
 *
 * Notes:
 *   - `string="false"` means the value is JSON: "5" → 5, "[\"a\"]" → ["a"].
 *   - A failed JSON parse keeps the raw string instead of dropping the argument.
 */
```

## Example — streaming transform

```ts
/**
 * DsmlSieve — splits streamed content into prose and completed tool calls.
 *
 * Input (chunks arrive in order; a tag can split across them):
 *   1. "Done.\n\n<｜14731｜tool_calls>"
 *   2. "<｜14731｜invoke name=\"search_knowledge\">…</｜14731｜invoke></｜14731｜tool_calls>"
 *
 * Output (per push, plus a final flush):
 *   push(1) → { "text": "Done.\n\n", "calls": [] }
 *   push(2) → { "text": "", "calls": [{ "name": "search_knowledge", "args": { "query": "auth", "limit": 5 } }] }
 *   flush() → { "text": "", "calls": [] }
 *
 * Notes:
 *   - A trailing `<` is held until it resolves, so markup is never emitted as text.
 *   - A cut-off block is parsed best-effort on flush.
 */
```

## Real instance

`apps/api/src/modules/ai/providers/deepseek/dsml.ts` follows this pattern at the file header, on
`parseDsmlBlock`, and on `DsmlSieve`.
