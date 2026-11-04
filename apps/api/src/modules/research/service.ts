import { aiRuns, projects, type Db, type ProjectResearch } from '@nexus/db';
import type { OnboardingDataType, ProjectResearchType } from '@nexus/types';
import { kickoffSummarySchema, researchDigestSchema } from '@nexus/zod-schemas';

import { env } from '../../env';
import { modelForTask } from '../../lib/client';
import { ConflictError, ensure, ValidationError } from '../../errors';
import { OnboardingRepository } from '../onboarding/repository';
import { enqueueResearch } from './queues';
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

/** The brief only needs goal-level facts; synthesize them from the project when onboarding is absent. */
function buildFallbackStepData(project: typeof projects.$inferSelect): OnboardingDataType {
  const summary = kickoffSummarySchema.safeParse(project.summary);
  const goal = summary.success ? summary.data.overview : (project.description ?? project.name);

  return {
    step1: {
      name: project.name,
      category: project.category,
      ...(project.description ? { description: project.description } : {}),
    },
    step2: { context: goal, level: 'intermediate' },
    step3: { files: [], link: null, textTitle: null, textContent: null },
    step4: { deliverables: [] },
    step5: { taskIds: [] },
  };
}

export function ResearchService(db: Db) {
  const repository = ResearchRepository(db);

  /** The most recent completed research for a project, or null. */
  async function getNew(projectId: string): Promise<ProjectResearchType | null> {
    const row = await repository.getNewByProjectId(projectId);
    return row ? toProjectResearchView(row) : null;
  }

  /** All completed research for a project, oldest first (one entry per version). */
  async function list(projectId: string): Promise<ProjectResearchType[]> {
    const rows = await repository.listCompletedByProjectId(projectId);
    return rows.map(toProjectResearchView);
  }

  /** The queued/processing research run for a project, or null. */
  async function getActive(projectId: string): Promise<{ runId: string } | null> {
    const active = await repository.getActiveRunByProjectId(projectId);
    return active ? { runId: active.id } : null;
  }

  /** Starts an on-demand research run, keeping older versions. */
  async function start({
    projectId,
    userId,
    reason,
    sourceLimit,
    project,
  }: {
    projectId: string;
    userId: string;
    reason?: string;
    sourceLimit?: number;
    project: typeof projects.$inferSelect;
  }): Promise<{ runId: string }> {
    ensure(env.TAVILY_API_KEY, ValidationError('Research is not configured for this workspace.'));

    // Generate from onboarding stepData when it has the goal-level facts; otherwise fall
    // back to the project's own fields. No completeness check — use what's available.
    const onboarding = await OnboardingRepository(db).getByProjectId(projectId);

    const stepData = (onboarding?.stepData ?? {}) as Partial<OnboardingDataType>;

    const hasBriefSteps = Boolean(stepData.step1 && stepData.step2 && stepData.step4);

    const data: OnboardingDataType = hasBriefSteps
      ? (stepData as OnboardingDataType)
      : buildFallbackStepData(project);

    ensure(
      !(await repository.getActiveRunByProjectId(projectId)),
      ConflictError('Research is already being generated for this project.'),
    );

    const [aiRun] = await db
      .insert(aiRuns)
      .values({
        projectId,
        userId,
        aiTask: 'research',
        model: modelForTask('research'),
        status: 'queued',
      })
      .returning();

    if (!aiRun) throw new Error('Failed to insert research AI run');

    await enqueueResearch({
      jobId: aiRun.id,
      projectId,
      data,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      ...(sourceLimit ? { sourceLimit } : {}),
    });

    return { runId: aiRun.id };
  }

  return { getNew, getActive, start, list };
}
