// lib/hono-context.ts
import type { Context } from 'hono';
import type { deliverables, projects, tasks } from '@nexus/db';
import type { OnboardingDataType } from '@nexus/types';
import type { AuthenticatedUser } from '../auth-middleware';
import { HttpError } from '../errors';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
    onboarding: OnboardingDataType;
    project: typeof projects.$inferSelect;
    deliverable: typeof deliverables.$inferSelect;
    task: typeof tasks.$inferSelect;
  }
}

export function createContextGetter<K extends keyof import('hono').ContextVariableMap>(key: K) {
  return (c: Context): import('hono').ContextVariableMap[K] => {
    const value = c.get(key);
    if (value == null) {
      throw HttpError.internal(
        `Context variable "${key}" is not set — check that the required middleware ran for this route.`,
      );
    }
    return value;
  };
}

export const getUser = createContextGetter('user');
export const getOnboarding = createContextGetter('onboarding');
export const getProject = createContextGetter('project');
export const getDeliverable = createContextGetter('deliverable');
export const getTask = createContextGetter('task');
