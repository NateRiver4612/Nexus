import { sql } from 'drizzle-orm';

import { taskDods, taskSteps, tasks } from '@nexus/db';

/**
 * A single task row as a camelCase JSON object matching `taskSchema` — scalar
 * columns plus nested `steps`/`dods` and `createdBy` as the raw uuid.
 *
 * Built explicitly with `jsonb_build_object`: `to_jsonb(tasks)` would emit the
 * raw snake_case column names and omit the related `task_steps`/`task_dods`
 * rows entirely. Reused by modules that embed a whole task as one JSON value
 * (the milestone list's `tasks` array, the project's `currentTask`).
 */
export const taskJsonObject = sql`jsonb_build_object(
  'id', ${tasks.id},
  'title', ${tasks.title},
  'description', ${tasks.description},
  'status', ${tasks.status},
  'difficulty', ${tasks.difficulty},
  'estimatedTimeMinutes', ${tasks.estimatedTimeMinutes},
  'position', ${tasks.position},
  'completedAt', ${tasks.completedAt},
  'createdBy', ${tasks.createdBy},
  'createdAt', ${tasks.createdAt},
  'updatedAt', ${tasks.updatedAt},
  'steps', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ${taskSteps.id},
          'taskId', ${taskSteps.taskId},
          'value', ${taskSteps.value},
          'position', ${taskSteps.position},
          'status', ${taskSteps.status},
          'createdAt', ${taskSteps.createdAt},
          'updatedAt', ${taskSteps.updatedAt}
        )
        order by ${taskSteps.position}
      )
      from ${taskSteps}
      where ${taskSteps.taskId} = ${tasks.id}
    ),
    '[]'::jsonb
  ),
  'dods', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ${taskDods.id},
          'taskId', ${taskDods.taskId},
          'value', ${taskDods.value},
          'position', ${taskDods.position},
          'status', ${taskDods.status},
          'createdAt', ${taskDods.createdAt},
          'updatedAt', ${taskDods.updatedAt}
        )
        order by ${taskDods.position}
      )
      from ${taskDods}
      where ${taskDods.taskId} = ${tasks.id}
    ),
    '[]'::jsonb
  )
)`;
