import { z } from '@hono/zod-openapi';

/**
 * Shapes of the fenced "component" blocks the assistant may write in a reply (```stats, ```steps,
 * ```compare, ```accordion). The content is YAML and untrusted model output, so the client
 * validates it against these before rendering anything.
 *
 * Validation is lenient on purpose: `status` and `tone` accept any string and unknown values fall
 * back to a neutral style, so a block the model emits does not turn into raw text over a typo.
 */

/** Fence languages that render as a component. The web renderer must handle every one. */
export const richBlockLanguages = ['stats', 'steps', 'compare', 'accordion'] as const;
export type RichBlockLanguage = (typeof richBlockLanguages)[number];

const statSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.union([z.string(), z.number()]).transform((value) => String(value)),
  detail: z.string().max(200).optional(),
  tone: z.string().max(40).optional(),
});
export const statsBlockSchema = z.array(statSchema).min(1).max(6);

export const stepItemSchema = z.union([
  z.object({
    title: z.string().min(1).max(200),
    body: z.string().max(1000).optional(),
    status: z.string().max(40).optional(),
  }),
  z.string().min(1).max(300),
]);
export const stepsBlockSchema = z.array(stepItemSchema).min(1).max(12);

const compareColumnSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(z.string().min(1).max(300)).min(1).max(10),
  tone: z.string().max(40).optional(),
});
export const compareBlockSchema = z.array(compareColumnSchema).min(2).max(3);

const accordionItemSchema = z.object({
  title: z.string().min(1).max(200),
  /** Markdown. */
  body: z.string().min(1).max(3000),
});
export const accordionBlockSchema = z.array(accordionItemSchema).min(1).max(12);
