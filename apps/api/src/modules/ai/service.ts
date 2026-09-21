import { aiRuns, type Db } from '@nexus/db';
import { AIRepository } from './repository';

type AIRunType = typeof aiRuns.$inferSelect;

export function AIService(db: Db) {
  const aiRepository = AIRepository(db);

  async function get(id: string): Promise<AIRunType | undefined> {
    const row = await aiRepository.getById(id);

    return row;
  }

  return { get };
}
