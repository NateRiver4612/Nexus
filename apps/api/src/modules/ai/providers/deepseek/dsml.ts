import { randomUUID } from 'node:crypto';

/** A tool call parsed out of DSML markup. `args` is the decoded parameter object. */
export type DsmlToolCall = { name: string; args: Record<string, unknown> };

// DeepSeek V4 is supposed to stream tool calls in `delta.tool_calls`, but some streams leak them
// into `content` as DSML (`<｜14731｜tool_calls>…`) — a provider-side parser/routing defect, more
// frequent on Pro and with large arguments. This is a best-effort recovery path, not a supported
// format. `14731` is the DSML token; servers sometimes spell it `DSML` and/or drop the fullwidth
// bars, so the delimiter tolerates all three.
//
// Example — streamed content in, prose + parsed calls out:
//   input:  'Saving it.\n\n<｜14731｜tool_calls><｜14731｜invoke name="create_artifact">' +
//           '<｜14731｜parameter name="name" string="true">brief.md</｜14731｜parameter>' +
//           '<｜14731｜parameter name="type" string="true">document</｜14731｜parameter>' +
//           '</｜14731｜invoke></｜14731｜tool_calls>'
//   text:   'Saving it.\n\n'
//   calls:  [{ name: 'create_artifact', args: { name: 'brief.md', type: 'document' } }]
const D = String.raw`[｜|]?(?:DSML|14731)[｜|]?`;
const TAGS = String.raw`(?:tool_calls|function_calls|toolcalls|tool|calls)`;

const OPEN_TAG = new RegExp(String.raw`<${D}\s*${TAGS}\s*>`);
const CLOSE_TAG = new RegExp(String.raw`</${D}\s*${TAGS}\s*>`);
const INVOKE = new RegExp(
  String.raw`<${D}\s*invoke\s+name="([^"]+)"\s*>([\s\S]*?)</${D}\s*invoke>`,
  'g',
);
const PARAM = new RegExp(
  String.raw`<${D}\s*parameter\s+name="([^"]+)"(?:\s+string="(true|false)")?\s*>([\s\S]*?)</${D}\s*parameter>`,
  'g',
);

// A tag is well under 64 chars, so a `<` further than this from the buffer end can't start one.
const MAX_TAG_LENGTH = 64;

// `string="false"` means the value is JSON; a failed parse keeps the raw text rather than dropping it.
const decode = (raw: string, isString: boolean) => {
  if (isString) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/**
 * Parses the `<invoke>`/`<parameter>` tags inside one DSML tool-call block.
 *
 * @example
 * // input:  <｜14731｜invoke name="search_knowledge"><｜14731｜parameter name="limit" string="false">5</｜14731｜parameter></｜14731｜invoke>
 * // output: [{ name: 'search_knowledge', args: { limit: 5 } }]
 */
export function parseDsmlBlock(block: string): DsmlToolCall[] {
  const calls: DsmlToolCall[] = [];

  for (const [, name, body] of block.matchAll(INVOKE)) {
    const args: Record<string, unknown> = {};

    for (const [, key, isString, raw] of (body ?? '').matchAll(PARAM)) {
      if (key) args[key] = decode(raw ?? '', isString !== 'false');
    }

    calls.push({ name: name!, args });
  }

  return calls;
}

/** Stable id for a DSML-parsed call (the format carries none). */
export const dsmlCallId = () => `call_${randomUUID()}`;

/**
 * Splits a streamed reply into prose and DSML tool calls. `push` each content chunk; it returns
 * text safe to emit now plus any calls the chunk completed. `flush` at end-of-stream releases the
 * held tail and parses an unterminated block — markup is never emitted as text.
 *
 * @example
 * // Tags can split across chunks; `push` holds a trailing `<` until it's resolved.
 * const sieve = new DsmlSieve();
 * sieve.push('Done.\n\n<｜14731｜tool_calls>');
 * // → { text: 'Done.\n\n', calls: [] }
 * sieve.push('<｜14731｜invoke name="search_knowledge"><｜14731｜parameter name="query" string="true">auth</｜14731｜parameter><｜14731｜parameter name="limit" string="false">5</｜14731｜parameter></｜14731｜invoke></｜14731｜tool_calls>');
 * // → { text: '', calls: [{ name: 'search_knowledge', args: { query: 'auth', limit: 5 } }] }
 */
export class DsmlSieve {
  private buffer = '';
  private inside = false;

  push(chunk: string) {
    this.buffer += chunk;
    return this.drain(false);
  }

  flush() {
    return this.drain(true);
  }

  private drain(final: boolean): { text: string; calls: DsmlToolCall[] } {
    let text = '';
    const calls: DsmlToolCall[] = [];

    for (;;) {
      if (!this.inside) {
        const open = OPEN_TAG.exec(this.buffer);
        if (open) {
          text += this.buffer.slice(0, open.index);
          this.buffer = this.buffer.slice(open.index + open[0].length);
          this.inside = true;
          continue;
        }

        if (final) {
          text += this.buffer;
          this.buffer = '';
          break;
        }

        const safe = this.safeLength();
        if (safe > 0) {
          text += this.buffer.slice(0, safe);
          this.buffer = this.buffer.slice(safe);
        }
        break;
      }

      const close = CLOSE_TAG.exec(this.buffer);
      if (close) {
        calls.push(...parseDsmlBlock(this.buffer.slice(0, close.index)));
        this.buffer = this.buffer.slice(close.index + close[0].length);
        this.inside = false;
        continue;
      }

      // Unterminated block (the stream was cut off): parse what we can, but never leak the markup.
      if (final) {
        calls.push(...parseDsmlBlock(this.buffer));
        this.buffer = '';
        break;
      }
      break;
    }

    return { text, calls };
  }

  private safeLength(): number {
    const lt = this.buffer.lastIndexOf('<');
    if (lt === -1) return this.buffer.length;

    // Hold back only while that `<` could still become a tag; once enough text follows it, emit it.
    return this.buffer.length - lt < MAX_TAG_LENGTH ? lt : this.buffer.length;
  }
}
