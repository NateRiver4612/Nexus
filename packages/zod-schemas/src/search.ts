import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

export const searchResultSchema = z
  .object({
    type: z.enum(['project', 'planner', 'artifact', 'knowledge']),
    id: z.string().uuid(),
    title: z.string(),
    snippet: z.string().nullable(),
  })
  .openapi('SearchResult');

export const searchResultsSchema = z.array(searchResultSchema).openapi('SearchResults');

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  projectId: idSchema.optional(),
  types: z.array(z.enum(['project', 'planner', 'artifact', 'knowledge'])).default([]),
});
