import { z } from '@hono/zod-openapi';

import { taskStatusSchema } from '@nexus/zod-schemas';

import { MilestoneService } from '../../milestones/service';
import { defineTool } from '../types';

const MAX_TASKS = 50;

export const listTasksTool = defineTool({
  name: 'list_tasks',
  label: 'Looking through tasks…',
  description:
    'Lists the project’s tasks in plan order with id, title, status, difficulty and milestone. Optionally filter by status or milestone. Use it to find a task’s id before calling get_task.',
  parameters: z.object({
    status: taskStatusSchema.optional().describe('Only tasks with this status.'),
    milestoneId: z.uuid().optional().describe('Only tasks in this milestone.'),
  }),
  async run({ ctx, args }) {
    const milestones = await MilestoneService(ctx.db).listMilestones(ctx.projectId);

    const tasks = milestones
      .filter((milestone) => !args.milestoneId || milestone.id === args.milestoneId)
      .flatMap((milestone) =>
        milestone.tasks
          .filter((task) => !args.status || task.status === args.status)
          .map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            difficulty: task.difficulty,
            estimatedTimeMinutes: task.estimatedTimeMinutes ?? null,
            milestone: { id: milestone.id, title: milestone.title, status: milestone.status },
          })),
      );

    if (tasks.length === 0) return { content: 'No tasks match.' };

    return {
      content: JSON.stringify({
        total: tasks.length,
        // Bounded so a large plan can't flood the context window.
        tasks: tasks.slice(0, MAX_TASKS),
        ...(tasks.length > MAX_TASKS
          ? { note: `Showing the first ${MAX_TASKS}. Filter to see more.` }
          : {}),
      }),
    };
  },
});
