import type { Db, ProjectResearch } from '@nexus/db';
import type { ProjectResearchType } from '@nexus/types';
import { researchDigestSchema } from '@nexus/zod-schemas';

import { ResearchRepository } from './repository';

function toProjectResearchView(row: ProjectResearch): ProjectResearchType {
  const digest = researchDigestSchema.safeParse(row.content);

  return {
    id: row.id,
    projectId: row.projectId,
    aiRunId: row.aiRunId,
    status: row.status,
    provider: row.provider,
    model: row.model,
    digest: digest.success ? digest.data : null,
    sources: row.sources ?? [],
    creditsUsed: row.creditsUsed,
    responseTime: row.responseTime,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function ResearchService(db: Db) {
  const repository = ResearchRepository(db);

  async function getLatest(projectId: string): Promise<ProjectResearchType | null> {
    const row = await repository.getLatestByProjectId(projectId);
    return row ? toProjectResearchView(row) : null;
  }

  return { getLatest };
}
