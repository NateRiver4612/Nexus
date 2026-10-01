import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { kickoffSummarySchema } from '@nexus/zod-schemas';
import { buildSummarySystemPrompt, buildSummaryUserPrompt, type KickoffContext } from '../prompts';
import { attemptToolCall, type ChatMessage } from './toolCall';

export const SUMMARY_TOOL_NAME = 'generate_project_summary';

/** The summary is a small object grounded on the plan — a modest budget suffices. */
export const SUMMARY_MAX_TOKENS = 4000;
export const SUMMARY_MAX_TOKENS_RETRY = 6000;

export type SummaryResult = { summary: KickoffPlanType['summary']; usage?: CompletionUsage };

export async function generateSummary(
  context: KickoffContext,
  milestones: KickoffPlanType['milestones'],
): Promise<SummaryResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSummarySystemPrompt() },
    { role: 'user', content: buildSummaryUserPrompt(context, milestones) },
  ];

  const first = await attemptToolCall({
    messages,
    toolName: SUMMARY_TOOL_NAME,
    toolParamsSchema: kickoffSummarySchema,
    validateSchema: kickoffSummarySchema,
    maxTokens: SUMMARY_MAX_TOKENS,
  });
  if (first.ok) return { summary: first.data, usage: first.usage };

  const missingKeys = first.missingKeys ?? [];
  if (first.finishReason === 'length' || missingKeys.length > 0) {
    const reason =
      first.finishReason === 'length'
        ? 'truncated (finish_reason: length)'
        : `missing required fields: ${missingKeys.join(', ')}`;
    console.error(
      `[kickoff] summary first attempt ${reason} — retrying with ${SUMMARY_MAX_TOKENS_RETRY} tokens.`,
    );

    const correction =
      missingKeys.length > 0
        ? `Your previous response was incomplete: it was missing required field(s): ` +
          `${missingKeys.join(', ')}. Re-generate the FULL summary object — overview, keyTopics, ` +
          `highlights — grounded in the plan above.`
        : undefined;

    const retry = await attemptToolCall({
      messages: [
        ...messages,
        ...(correction ? [{ role: 'user' as const, content: correction }] : []),
      ],
      toolName: SUMMARY_TOOL_NAME,
      toolParamsSchema: kickoffSummarySchema,
      validateSchema: kickoffSummarySchema,
      maxTokens: SUMMARY_MAX_TOKENS_RETRY,
    });
    if (retry.ok) return { summary: retry.data, usage: retry.usage };

    // A truncated summary is a straightforward "write less" problem.
    if (retry.finishReason === 'length') {
      throw new Error(
        `AI summary generation exceeded the token limit even after a retry (${SUMMARY_MAX_TOKENS_RETRY} completion tokens). ` +
          `The plan is too large — trim the project scope or lower per-task requirements.`,
      );
    }
    throw retry.error;
  }

  throw first.error;
}
