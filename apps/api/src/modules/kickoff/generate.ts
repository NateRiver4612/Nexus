// modules/kickoff/generatePlan.ts
import { buildKickoffPrompt, type KickoffContext } from './prompt';
import { env } from '../../env';
import { getDeepSeekClient } from '../../lib/client';
import z from 'zod';
import type { KickoffPlanType } from '@nexus/types';
import { kickoffPlanSchema } from '@nexus/zod-schemas';
import type OpenAI from 'openai';
import type { CompletionUsage } from 'openai/resources/completions.mjs';

const PLAN_TOOL_NAME = 'generate_project_plan';

interface DeepSeekChatCompletionParams extends OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number; // include if configuring max thinking tokens
  };
}

export async function generateKickoffPlan(context: KickoffContext): Promise<{
  data: KickoffPlanType;
  usage?: CompletionUsage;
}> {
  const client = getDeepSeekClient();

  const response = await client.chat.completions.create({
    model: env.AI_KICKOFF_MODEL,
    messages: [
      { role: 'system', content: KICKOFF_SYSTEM_PROMPT },
      { role: 'user', content: buildKickoffPrompt(context) },
    ],
    max_completion_tokens: 4096,
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

  const parsedArgs = JSON.parse(toolCall.function.arguments);

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

const KICKOFF_SYSTEM_PROMPT = `You are Nexus's project kickoff planner. Given a user's project goal, \
category, context, and any uploaded resources, generate a realistic execution plan: milestones broken \
into concrete tasks, plus deliverables worth producing along the way. Keep milestone counts reasonable \
(3-6 typically) and each milestone's tasks actionable and specific to what the user described — never \
generic placeholders. Call the generate_project_plan tool with your result.`;
