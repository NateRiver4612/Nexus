import type { KickoffPlanType } from '@nexus/types';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { kickoffSummarySchema } from '@nexus/zod-schemas';
import { buildSummarySystemPrompt, buildSummaryUserPrompt, type KickoffContext } from '../prompts';
import { attemptToolCallWithRetry, type AttemptToolCallFailure } from './toolCall';
import type { ChatMessage } from '../../ai/types';

export const SUMMARY_TOOL_NAME = 'generate_project_summary';

/** The summary is a small object grounded on the plan — a modest budget suffices. */
export const SUMMARY_MAX_TOKENS = 4000;
export const SUMMARY_MAX_TOKENS_RETRY = 6000;

export type SummaryResult = { summary: KickoffPlanType['summary']; usage?: CompletionUsage };

function buildSummaryCorrection({
  issues = [],
  missingKeys = [],
}: AttemptToolCallFailure): string | null {
  if (issues.length > 0) {
    return (
      `Your previous response failed validation. Fix exactly these issues and re-output the FULL ` +
      `summary object — overview, keyTopics, highlights — grounded in the plan above, respecting ` +
      `each field's length limit:\n` +
      issues.map((issue) => `- ${issue}`).join('\n')
    );
  }

  if (missingKeys.length > 0) {
    return (
      `Your previous response was incomplete: it was missing required field(s): ` +
      `${missingKeys.join(', ')}. Re-generate the FULL summary object — overview, keyTopics, ` +
      `highlights — grounded in the plan above.`
    );
  }

  return null;
}

export async function generateSummary(
  context: KickoffContext,
  milestones: KickoffPlanType['milestones'],
): Promise<SummaryResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSummarySystemPrompt() },
    { role: 'user', content: buildSummaryUserPrompt(context, milestones) },
  ];

  const { data, usage } = await attemptToolCallWithRetry({
    messages,
    toolName: SUMMARY_TOOL_NAME,
    toolParamsSchema: kickoffSummarySchema,
    validateSchema: kickoffSummarySchema,
    maxTokens: SUMMARY_MAX_TOKENS,
    maxTokensRetry: SUMMARY_MAX_TOKENS_RETRY,
    label: 'summary generation',
    buildCorrection: buildSummaryCorrection,
  });

  return { summary: data, usage };
}
