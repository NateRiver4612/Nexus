import { getDeepSeekClient } from '../../../lib/client';
import { env } from '../../../env';
import z from 'zod';
import type OpenAI from 'openai';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { jsonrepair } from 'jsonrepair';

interface DeepSeekChatCompletionParams extends OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
  };
}

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

export type AttemptToolCallInput<T> = {
  messages: ChatMessage[];
  toolName: string;
  toolParamsSchema: z.ZodType;
  validateSchema: z.ZodType<T>;
  maxTokens: number;
};

export type AttemptToolCallResult<T> =
  | { ok: true; data: T; finishReason?: string; usage?: CompletionUsage }
  | {
      ok: false;
      error: Error;
      finishReason?: string;
      missingKeys?: string[];
      /** Per-field validation problems, e.g. "milestones.0.tasks.1.description: Too big: ..." */
      issues?: string[];
    };

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
}: AttemptToolCallInput<T>): Promise<AttemptToolCallResult<T>> {
  const client = getDeepSeekClient();

  const response = await client.chat.completions.create({
    model: env.AI_KICKOFF_MODEL,
    messages,
    max_completion_tokens: maxTokens,
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

  const finishReason = response.choices[0]?.finish_reason ?? 'unknown';

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];

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

  console.error('finish_reason:', finishReason);
  console.error('arguments length:', toolCall?.function?.arguments?.length);

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
