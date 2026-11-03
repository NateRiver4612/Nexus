import type { Db } from '@nexus/db';

import { MilestoneService } from '../../milestones/service';
import { ProjectService } from '../../projects/service';

const MAX_DESCRIPTION_CHARS = 500;
const MAX_TITLE_CHARS = 80;
const MAX_MILESTONES = 10;

export const truncate = ({ text, max }: { text: string; max: number }) =>
  text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;

/**
 * A small, always-on general context of the project for the chat system prompt (~1.5k chars max).
 * It only orients the model; anything deeper is meant to be fetched by tools in later steps.
 *
 * There is no `goal` column on projects, so the kickoff summary's overview stands in for it.
 *
 * No access check here on purpose: the caller has already proven the user owns the
 * conversation and can access its project.
 */
export async function buildProjectGeneralContext({ db, projectId }: { db: Db; projectId: string }) {
  const [project, milestones] = await Promise.all([
    ProjectService(db).get(projectId),
    MilestoneService(db).listMilestones(projectId),
  ]);

  if (!project) return 'No project details are available.';

  const lines = [`Name: ${project.name} (${project.category}, ${project.status})`];

  if (project.description) {
    lines.push(
      `Description: ${truncate({ text: project.description, max: MAX_DESCRIPTION_CHARS })}`,
    );
  }
  if (project.summary?.overview) lines.push(`Overview: ${project.summary.overview}`);

  lines.push(
    `Progress: ${project.progressPercentage}% (${project.numOfCompletedTasks}/${project.numOfTasks} tasks done)`,
  );

  if (project.currentTask) {
    lines.push(
      `Current task: ${truncate({ text: project.currentTask.title, max: MAX_TITLE_CHARS })} [${project.currentTask.status}]`,
    );
  }

  if (milestones.length > 0) {
    lines.push('Milestones:');
    for (const [index, milestone] of milestones.slice(0, MAX_MILESTONES).entries()) {
      const done = milestone.tasks.filter((task) => task.status === 'completed').length;
      lines.push(
        `${index + 1}. ${truncate({ text: milestone.title, max: MAX_TITLE_CHARS })} - ${milestone.status}, ${done}/${milestone.tasks.length} tasks done`,
      );
    }
    if (milestones.length > MAX_MILESTONES) {
      lines.push(`(+${milestones.length - MAX_MILESTONES} more milestones)`);
    }
  }

  return lines.join('\n');
}
