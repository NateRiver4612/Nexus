import { z } from '@hono/zod-openapi';

import { TaskService } from '../../tasks/service';
import { defineTool } from '../types';

const MAX_NOTES = 5;
const MAX_NOTE_CHARS = 1500;

export const getTaskTool = defineTool({
  name: 'get_task',
  label: 'Reading task…',
  description:
    'Full detail of one task: description, steps, definition-of-done items with their status, and the user’s notes. Get the id from list_tasks or get_project_overview; never invent one.',
  parameters: z.object({ taskId: z.uuid().describe('Task id from list_tasks.') }),
  async run({ ctx, args }) {
    const tasks = TaskService(ctx.db);
    const task = await tasks.getDetail(args.taskId);

    // The id comes from the model, so a task in another project must look exactly like a
    // missing one. This check is what keeps the tool inside the conversation's project.
    if (!task || task.project.id !== ctx.projectId) return { content: 'Task not found.' };

    const notes = await tasks.listNotes(task.id);

    return {
      content: JSON.stringify({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        difficulty: task.difficulty,
        estimatedTimeMinutes: task.estimatedTimeMinutes ?? null,
        milestone: task.milestone?.title ?? null,
        steps: task.steps.map((step) => ({ value: step.value, status: step.status })),
        definitionOfDone: task.dods.map((dod) => ({ value: dod.value, status: dod.status })),
        notes: notes.slice(0, MAX_NOTES).map((note) => ({
          title: note.title,
          text: (note.contentText ?? '').slice(0, MAX_NOTE_CHARS),
        })),
        ...(notes.length > MAX_NOTES ? { moreNotes: notes.length - MAX_NOTES } : {}),
      }),
    };
  },
});
