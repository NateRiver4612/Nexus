// modules/kickoff/generatePlan.ts
import { buildKickoffPrompt, buildKickoffSystemPrompt, type KickoffContext } from './prompt';
import { env } from '../../env';
import { getDeepSeekClient } from '../../lib/client';
import z from 'zod';
import type { KickoffPlanType } from '@nexus/types';
import { kickoffPlanSchema } from '@nexus/zod-schemas';
import type OpenAI from 'openai';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { jsonrepair } from 'jsonrepair';

const PLAN_TOOL_NAME = 'generate_project_plan';

interface DeepSeekChatCompletionParams extends OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number; // include if configuring max thinking tokens
  };
}

export type GeneratedKickoffPlan = {
  data: KickoffPlanType;
  usage?: CompletionUsage;
};

export async function generateKickoffPlan(context: KickoffContext): Promise<GeneratedKickoffPlan> {
  const client = getDeepSeekClient();

  const response = await client.chat.completions.create({
    model: env.AI_KICKOFF_MODEL,
    messages: [
      { role: 'system', content: buildKickoffSystemPrompt(context.stepData) },
      { role: 'user', content: buildKickoffPrompt(context) },
    ],
    max_completion_tokens: 6000,
    thinking: { type: 'disabled' },
    tools: [
      {
        type: 'function',
        function: {
          name: PLAN_TOOL_NAME,
          description: 'Submit the generated project kickoff plan.',
          parameters: z.toJSONSchema(kickoffPlanSchema),
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: PLAN_TOOL_NAME } }, // forces the call
  } as DeepSeekChatCompletionParams);

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== PLAN_TOOL_NAME) {
    throw new Error(
      `DeepSeek did not return a result via the expected tool call: ${PLAN_TOOL_NAME}`,
    );
  }

  let parsedArgs;

  try {
    parsedArgs = JSON.parse(toolCall.function.arguments);
  } catch {
    try {
      parsedArgs = JSON.parse(jsonrepair(toolCall.function.arguments));
    } catch {
      throw new Error(
        `DeepSeek returned malformed JSON in tool call arguments for: ${PLAN_TOOL_NAME}`,
      );
    }
  }

  // Validate before trusting it — the tool schema constrains shape loosely (JSON Schema),
  // Zod is the real gate (string length caps, milestone count bounds, enum values).
  const result = kickoffPlanSchema.safeParse(parsedArgs);

  if (!result.success) {
    throw new Error(
      `AI plan failed validation: ${result.error.issues.map((i) => i.message).join('; ')}`,
    );
  }

  return { data: result.data, usage: response.usage };
}
