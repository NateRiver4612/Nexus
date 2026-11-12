import type {
  AIProvider,
  ChatLoopEvent,
  ChatMessage,
  Tool,
  ToolCall,
  ToolContext,
  ToolDef,
  ToolResult,
} from '../types';
import { z } from '@hono/zod-openapi';
import { truncate } from './contextBuilder';

/** Model calls per turn. The last one runs without tools so the turn always ends in an answer. */
export const MAX_ITERATIONS = 8;
const MAX_TOOL_RESULT_CHARS = 6000;
// TEMP: keep each tool stage on screen long enough to read (demo pacing). Remove when done.
const MIN_STAGE_MS = 2000;
/** 2 retries = 3 attempts. Chat runs synchronously, so no queue retries it for us. */
const CHAT_MAX_RETRIES = 2;

// Runs one tool and swallows its failure so the model can recover.
// Citations are returned (not yielded) because yielding only works in the generator.
async function runTool({
  tool,
  ctx,
  args,
}: {
  tool: Tool;
  ctx: ToolContext;
  args: unknown;
}): Promise<ToolResult & { failed: boolean }> {
  try {
    const result = await tool.run({ ctx, args });
    return { ...result, failed: false };
  } catch (error) {
    // The model gets a generic message; the real error stays in our logs.
    // so that during retry, we don't yield failed tool result to the UI
    // therefore the model can retry without the user seeing a failed tool result.
    console.error(`[project-chat] tool ${tool.name} failed`, error);
    return { content: 'The tool failed. Try again or answer without it.', failed: true };
  }
}

/** Holds a tool's "running" stage until it has been visible for at least `MIN_STAGE_MS`. */
async function holdStage(startedAt: number) {
  const remaining = MIN_STAGE_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

/**
 * A plain bounded tool loop: call the model, run whatever tools it asks for, feed the results
 * back, repeat until it answers in text. Failures inside a tool (bad arguments, unknown tool,
 * a thrown error) go back to the model as the tool result so it can recover; only provider
 * errors propagate. Aborting `signal` ends the generator quietly.
 */
export async function* runChatLoop({
  provider,
  model,
  messages,
  tools,
  ctx,
  signal,
}: {
  provider: AIProvider;
  model: string;
  messages: ChatMessage[];
  tools: Tool[];
  ctx: ToolContext;
  signal: AbortSignal;
}): AsyncGenerator<ChatLoopEvent> {
  // Copy, don't mutate the caller's messages:
  //   [...input, assistant turn, tool result, assistant turn, …]
  const conversation = [...messages];
  // Name → Tool, for O(1) lookup when the model asks for one.
  const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
  // Provider needs only the schema side; `label`/`run` stay server-side.
  const toolDefs: ToolDef[] = tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));

  // Set after a turn emits text, so the next text starts a new paragraph (see the text-delta branch).
  let separateNextText = false;

  // One model call per iteration: stream → run requested tools → feed results back → repeat.
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Last pass runs with no tools, so the model must answer in text.
    const isLast = iteration === MAX_ITERATIONS - 1;
    let text = ''; // assistant text for this iteration
    const calls: ToolCall[] = []; // complete tool calls the model requested
    let cutOff = false; // the model hit its token limit before it finished

    // Raw provider events here:
    //   { type: 'text-delta', text } | { type: 'tool-call', call } | { type: 'usage', usage }
    for await (const event of provider.streamChat({
      model,
      messages: conversation,
      tools: isLast ? undefined : toolDefs, // undefined on the final pass → text-only answer
      signal,
      retries: CHAT_MAX_RETRIES,
    })) {
      if (event.type === 'text-delta') {
        // Text before a tool call ("Let me check…") must not run into the final assistant text text.
        // Invalid tool call text: Let me search your project...Your auth middleware is in src/auth.ts
        // Let me search your project...
        // Your auth middleware is in src/auth.ts
        if (separateNextText && event.text) {
          yield { type: 'text-delta', text: '\n\n' };
          separateNextText = false;
        }
        text += event.text;

        yield event;
      } else if (event.type === 'tool-call') {
        // Provider emits this only once the call is complete, so args are safe to use.
        calls.push(event.call);
      } else if (event.type === 'usage') {
        // Route totals this and persists it; it is never streamed to the client.
        yield event;
      } else if (event.type === 'finish') {
        cutOff = event.reason === 'length';
      }
    }

    // Aborted by the client, or the model answered in text → this turn is done.
    if (signal.aborted || calls.length === 0) return;

    // Why wait until the stream ends: the next request must contain ONE assistant message listing
    // all tool calls, then one `tool` message per call. Until the stream ends we don't know how many
    // calls there are, so we can't build that message or run any tool yet.
    // Record the assistant turn before its results:
    //   { role: 'assistant', content: 'Let me check…', toolCalls: [{ id, name, args }] }
    conversation.push({ role: 'assistant', content: text, toolCalls: calls });
    // If it said anything, break the eventual answer into a new paragraph.
    separateNextText = text.trim().length > 0;

    // Calls run sequentially, in the order the model asked for them.
    for (const call of calls) {
      if (signal.aborted) return;

      const validTool = toolByName.get(call.name);
      const label = validTool?.label ?? call.name; // UI text; falls back to the raw name

      let content: string; // what the model sees as this tool's result
      let failed = false;

      const stageStartedAt = Date.now();
      // UI: { type: 'tool', id, name, label, status: 'running' } → spinner by the label
      yield { type: 'tool', id: call.id, name: call.name, label, status: 'running' };

      if (cutOff) {
        // The provider repairs cut-off JSON into something that parses, so without this check
        // a half-written artifact would be saved as if it were complete.
        content =
          'Your reply was cut off before this call finished, so it was not run. Try again with shorter content.';
        failed = true;
        console.warn(
          `[project-chat] ${call.name} skipped: reply was cut off (finish_reason length)`,
        );
      } else if (!validTool) {
        // Model gets this string so it can retry:
        //   'Unknown tool "foo". Available tools: searchKnowledge, getProject.'
        content = `Unknown tool "${call.name}". Available tools: ${[...toolByName.keys()].join(', ')}.`;
        failed = true;
        console.warn(`[project-chat] model called unknown tool "${call.name}"`);
      } else {
        // Validate model args against the tool schema before running it.
        const parsed = validTool.parameters.safeParse(call.args);

        if (!parsed.success) {
          // Model gets the prettified zod error, e.g.
          //   'Invalid arguments: query: Expected string, received number'
          const issues = z.prettifyError(parsed.error);
          content = `Invalid arguments: ${issues}`;
          failed = true;
          console.warn(`[project-chat] invalid arguments for ${call.name}: ${issues}`);
        }
        // Best effort case
        else {
          const result = await runTool({ tool: validTool, ctx, args: parsed.data });
          content = result.content;
          failed = result.failed;

          // Citations go to the UI, not the model:
          //   { type: 'sources', sources: [{ sourceId, title, ... }] }
          if (result.sources?.length) {
            yield {
              type: 'sources',
              sources: result.sources,
            };
          }

          // Same idea for artifacts: the UI shows a card, the model only sees `content`.
          if (result.artifact) {
            yield { type: 'artifact', artifact: result.artifact };
          }
        }
      }

      // Hold the stage so a fast tool doesn't flash by (TEMP demo pacing).
      await holdStage(stageStartedAt);

      // Same event with status 'done' | 'error' → clears/replaces the spinner.
      yield {
        type: 'tool',
        id: call.id,
        name: call.name,
        label,
        status: failed ? 'error' : 'done',
      };

      // Feed the result back so the next model call can use it. Truncated to keep the
      // context small; id ties it to the assistant's toolCalls entry:
      //   { role: 'tool', toolCallId: 'call_1', content: '…up to 6000 chars…' }
      conversation.push({
        role: 'tool',
        // Tools that return long text (read_url) opt into a higher cap via `maxResultChars`.
        content: truncate({
          text: content,
          max: validTool?.maxResultChars ?? MAX_TOOL_RESULT_CHARS,
        }),
        toolCallId: call.id,
      });
    }
  }
}
