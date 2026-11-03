import { z } from '@hono/zod-openapi';

import { MilestoneService } from '../../milestones/service';
import { ProjectService } from '../../projects/service';
import { defineTool } from '../types';

export const getProjectOverviewTool = defineTool({
  name: 'get_project_overview',
  label: 'Reading project overview…',
  description:
    'Full project details: description, the kickoff summary (overview, key topics, highlights), progress, and every milestone with its status and task counts. Use it for questions about scope, plan or progress that the short general project context in the system prompt does not answer.',
  parameters: z.object({}),
  async run({ ctx }) {
    const [project, milestones] = await Promise.all([
      ProjectService(ctx.db).get(ctx.projectId),
      MilestoneService(ctx.db).listMilestones(ctx.projectId),
    ]);

    if (!project) return { content: 'Project not found.' };

    return {
      content: JSON.stringify({
        name: project.name,
        category: project.category,
        status: project.status,
        description: project.description,
        summary: project.summary,
        progress: {
          percentage: project.progressPercentage,
          completedTasks: project.numOfCompletedTasks,
          totalTasks: project.numOfTasks,
        },
        currentTask: project.currentTask
          ? { id: project.currentTask.id, title: project.currentTask.title }
          : null,
        milestones: milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          tasksDone: milestone.tasks.filter((task) => task.status === 'completed').length,
          tasksTotal: milestone.tasks.length,
        })),
      }),
    };
  },
});
