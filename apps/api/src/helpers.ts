import type { ProjectCategoryType } from '@nexus/types';
import { projectCategoryEnum } from '@nexus/zod-schemas';

import { ensure, ValidationError } from './errors';

/** Resolve a step-1 category to the strict projects.category enum. "Other"/custom
 * values aren't supported yet (AI category support comes later) — reject them. */
export function toProjectCategory(value: string): ProjectCategoryType {
  const parsed = projectCategoryEnum.safeParse(value);
  ensure(
    parsed.success,
    ValidationError(
      `Category "${value}" is not supported yet. Pick one of: ${projectCategoryEnum.options.join(', ')}.`,
    ),
  );
  return parsed.data;
}
