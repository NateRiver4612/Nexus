import { aiRuns, type Db } from '@nexus/db';

import { ensureExists, InternalError } from '../../errors';
import { AIRepository } from './repository';
import type { Usage } from '@nexus/types';

type AIRunType = typeof aiRuns.$inferSelect;

export function AIService(db: Db) {
  const aiRepository = AIRepository(db);

  async function get(id: string): Promise<AIRunType | undefined> {
    const row = await aiRepository.getById(id);

    return row;
  }

  /** Opens a synchronous (non-queued) run for project chat; the caller closes it. */
  async function startChatRun({
    projectId,
    userId,
    model,
  }: {
    projectId: string;
    userId: string;
    model: string;
  }) {
    const [row] = await aiRepository.create({
      projectId,
      userId,
      aiTask: 'project-chat',
      status: 'processing',
      model,
      startedAt: new Date(),
    });

    return ensureExists(row, InternalError('Failed to start AI run'));
  }

  async function completeRun({ id, usage }: { id: string; usage: Usage }) {
    await aiRepository.update({
      id,
      patch: {
        status: 'completed',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        completedAt: new Date(),
      },
    });
  }

  async function failRun({
    id,
    usage,
    errorMessage,
  }: {
    id: string;
    usage: Usage;
    errorMessage: string;
  }) {
    await aiRepository.update({
      id,
      patch: {
        status: 'failed',
        errorMessage,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        completedAt: new Date(),
      },
    });
  }

  return { get, startChatRun, completeRun, failRun };
}

export type AIServiceType = ReturnType<typeof AIService>;
