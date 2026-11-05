import { getDeepSeekClient } from '../../../lib/client';
import { env } from '../../../env';
import { toAIProviderError } from '../../ai/providers/deepseek/errors';
import z from 'zod';
import type OpenAI from 'openai';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { jsonrepair } from 'jsonrepair';
import type { ChatMessage } from '../../ai/types';

/**
 * OpenAI's non-streaming chat params plus DeepSeek's non-standard `thinking` toggle,
 * which isn't part of the OpenAI SDK types. The call below is cast to this so we can
 * pass `thinking` without loosening the SDK's type checking.
 */
type DeepSeekChatCompletionParams = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
  };
};

export type AttemptToolCallInput<T> = {
  messages: ChatMessage[];
  toolName: string;
  /** Loose JSON Schema exposed to the model as the tool's parameter shape. */
  toolParamsSchema: z.ZodType;
  /**
   * The real validation gate applied to the model's output. May be stricter than
   * `toolParamsSchema` (length caps, count bounds, enums) — JSON Schema only guides
   * the model; this is what we actually trust.
   */
  validateSchema: z.ZodType<T>;
  maxTokens: number;
  /** Overrides the default kickoff model (e.g. the cheaper research-prompt builder). */
  model?: string;
};

/** Diagnostics from a failed tool call, used to build a corrective retry message. */
export type AttemptToolCallFailure = {
  error: Error;
  finishReason?: string;
  missingKeys?: string[];
  /** Per-field validation problems, e.g. "milestones.0.tasks.1.description: Too big: ..." */
  issues?: string[];
};

/** Discriminated on `ok`, so callers get either validated data or the retry diagnostics. */
export type AttemptToolCallResult<T> =
  | { ok: true; data: T; finishReason?: string; usage?: CompletionUsage }
  | ({ ok: false } & AttemptToolCallFailure);

/**
 * The shared single-tool-call core used by both kickoff stages: require the
 * tool call, parse + repair the JSON, validate with the real zod gate, and pull
 * out the path-named diagnostics (`keys present`, missing keys) for retries.
 */
export async function attemptToolCall<T>({
  messages,
  toolName,
  toolParamsSchema,
  validateSchema,
  maxTokens,
  model,
}: AttemptToolCallInput<T>): Promise<AttemptToolCallResult<T>> {
  const client = getDeepSeekClient();

  // One forced tool call: the model must answer through `toolName`, so we never have to
  // parse prose or guess which shape it returned. `thinking` is disabled for this cheap,
  // deterministic generation step.
  let response: OpenAI.Chat.ChatCompletion;

  try {
    response = await client.chat.completions.create({
      model: model ?? env.AI_KICKOFF_MODEL,
      messages,
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
      tools: [
        {
          type: 'function',
          function: {
            name: toolName,
            description: `Submit the generated result via ${toolName}.`,
            parameters: z.toJSONSchema(toolParamsSchema),
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: toolName } }, // forces the call
    } as DeepSeekChatCompletionParams);
  } catch (error) {
    // Normalize raw OpenAI SDK failures so the research stage can classify them as transient.
    // Without this, a brief-builder blip would bypass the whole-run retry.
    throw toAIProviderError(error);
  }

  // A non-streaming forced call returns a single choice; treat anything else as unknown.
  const finishReason = response.choices[0]?.finish_reason ?? 'unknown';

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];

  // Missing or mismatched tool call is a hard failure — there's no prose fallback to parse.
  if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== toolName) {
    return {
      ok: false,
      finishReason,
      missingKeys: [],
      error: new Error(
        `DeepSeek did not return a result via the expected tool call: ${toolName} (finish_reason: ${finishReason})`,
      ),
    };
  }

  let parsedArgs;

  // debug: temporary diagnostics for truncated/malformed responses.
  console.error('finish_reason:', finishReason);
  console.error('arguments length:', toolCall?.function?.arguments?.length);

  // Parse directly first; fall back to `jsonrepair` for near-valid JSON (truncation,
  // stray trailing characters) that JSON.parse rejects.
  try {
    parsedArgs = JSON.parse(toolCall.function.arguments);
  } catch {
    try {
      parsedArgs = JSON.parse(jsonrepair(toolCall.function.arguments));
    } catch (repairError) {
      console.error('jsonrepair also failed:', repairError);

      return {
        ok: false,
        finishReason,
        missingKeys: [],
        error: new Error(
          `DeepSeek returned malformed ${toolName} arguments (finish_reason: ${finishReason}, ` +
            `arguments: ${preview(toolCall.function.arguments)}). jsonrepair failed: ` +
            `${repairError instanceof Error ? repairError.message : String(repairError)}`,
        ),
      };
    }
  }

  // Validate before trusting it — the tool schema constrains shape loosely (JSON Schema),
  // Zod is the real gate (string length caps, milestone count bounds, enum values).
  const result = validateSchema.safeParse(parsedArgs);

  if (!result.success) {
    // Zod reports absent keys as "received undefined"; those paths become the retry's
    // missing-field list, while all issues feed the field-level correction message.
    const missingKeys = result.error.issues
      .filter((issue) => issue.message.includes('received undefined'))
      .map((issue) => issue.path.join('.'));

    return {
      ok: false,
      finishReason,
      missingKeys,
      issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      error: new Error(
        `AI ${toolName} failed validation (finish_reason: ${finishReason}): ` +
          `${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')} ` +
          `| keys present: ${Object.keys(parsedArgs).join(', ') || '(none)'} ` +
          `| parsed args: ${preview(JSON.stringify(parsedArgs))}`,
      ),
    };
  }

  return { ok: true, finishReason, data: result.data, usage: response.usage };
}

export type AttemptToolCallWithRetryInput<T> = {
  messages: ChatMessage[];
  toolName: string;
  toolParamsSchema: z.ZodType;
  validateSchema: z.ZodType<T>;
  maxTokens: number;
  /** Escalated budget for the single retry — truncation is the usual first-attempt failure. */
  maxTokensRetry: number;
  model?: string;
  /** Appended as an extra user message before the retry; null → retry with just a bigger budget. */
  buildCorrection: (failure: AttemptToolCallFailure) => string | null;
  /** Label for the final token-limit error, e.g. "plan generation". */
  label: string;
};

/**
 * The shared single-retry wrapper around `attemptToolCall`: one corrective retry
 * with an escalated token budget, then a friendly token-limit error (or the raw
 * retry error). Callers supply only what differs — their tool/schema, budgets,
 * correction wording (`buildCorrection`), and success mapping.
 */
export async function attemptToolCallWithRetry<T>({
  messages,
  toolName,
  toolParamsSchema,
  validateSchema,
  maxTokens,
  maxTokensRetry,
  model,
  buildCorrection,
  label,
}: AttemptToolCallWithRetryInput<T>): Promise<{ data: T; usage?: CompletionUsage }> {
  const first = await attemptToolCall({
    messages,
    toolName,
    toolParamsSchema,
    validateSchema,
    maxTokens,
    model,
  });
  if (first.ok) return { data: first.data, usage: first.usage };

  // One corrective retry: append the caller's failure-specific guidance (if any) and
  // rerun with the escalated budget.
  const correction = buildCorrection(first);
  const retryMessages: ChatMessage[] = correction
    ? [...messages, { role: 'user', content: correction }]
    : messages;

  const retry = await attemptToolCall({
    messages: retryMessages,
    toolName,
    toolParamsSchema,
    validateSchema,
    maxTokens: maxTokensRetry,
    model,
  });

  if (retry.ok) return { data: retry.data, usage: retry.usage };

  // Hitting the token cap is the expected hard failure, so translate it into a friendly
  // actionable message; anything else surfaces the raw retry error.
  if (retry.finishReason === 'length') {
    throw new Error(
      `AI ${label} exceeded the token limit even after a retry (${maxTokensRetry} completion tokens). ` +
        `The request is too large — trim the scope or lower per-item requirements.`,
    );
  }
  throw retry.error;
}

/** Sums prompt/completion tokens across multiple calls. */
export function mergeUsage(
  ...usages: Array<CompletionUsage | undefined>
): CompletionUsage | undefined {
  const present = usages.filter((u): u is CompletionUsage => Boolean(u));
  if (present.length === 0) return undefined;

  return {
    prompt_tokens: present.reduce((acc, u) => acc + (u.prompt_tokens ?? 0), 0),
    completion_tokens: present.reduce((acc, u) => acc + (u.completion_tokens ?? 0), 0),
    total_tokens: present.reduce((acc, u) => acc + (u.total_tokens ?? 0), 0),
  };
}

/** Truncates a string for embedding into an error message. */
function preview(value: string, max = 3200): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated ${value.length - max} chars]`;
}
