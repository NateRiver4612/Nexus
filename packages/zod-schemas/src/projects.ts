import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';

export const fileSchema = z
  .instanceof(File, { message: 'Please select a valid file.' })
  .refine((file) => file.size > 0, 'File cannot be empty.')
  .refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 25MB.')
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    'Unsupported file type. Try PDF, DOCX, XLSX, CSV, TXT, MD, or an image.',
  )
  .openapi({
    type: 'string',
    format: 'binary',
    description: 'An uploaded source file.',
  });

export const projectSchema = z
  .object({
    id: idSchema,
    name: z
      .string({
        error: 'Project name is required',
      })
      .min(1)
      .max(255)
      .openapi({ example: 'Nexus' }),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/)
      .openapi({ example: 'nexus-planning' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'Modular monolith for planning and collaboration' }),
    status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
    ...timestampSchema,
  })
  .openapi('Project');

export const onboardingStatusSchema = z
  .enum(['in_progress', 'submitted', 'completed'])
  .default('in_progress');

/** How much the user wants to cover — scopes the generated kickoff plan. */
export const onboardingLevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);

export const onboardingStep1Schema = z.object({
  name: z
    .string()
    .min(1, {
      error: 'Project name is required',
    })
    .max(255)
    .openapi({ example: 'Market Research Report' }),
  description: z
    .string()
    .nullish()
    .openapi({ example: 'A report on market research for the new product launch' }),
  category: z
    .string()
    .min(1, {
      error: 'Project category is required',
    })
    .openapi({
      example: 'Marketing',
    }),
});

export const onboardingStep2Schema = z.object({
  context: z
    .string()
    .min(1, {
      error: 'Please describe your goal',
    })
    .openapi({
      example: `I need to research the competitors, identify pricing strategies, and analyze the market trends to create a comprehensive report that will help us make informed decisions for our new product launch.`,
    }),
  level: onboardingLevelEnum,
});

/** Serialized file metadata (a real `File` can't cross the wire or live in stepData jsonb). */
export const onboardingStep3FileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  mimeType: z.string().nullish(),
});

export const onboardingStep3Schema = z.object({
  files: onboardingStep3FileSchema.array().default([]),
  link: z
    .url({
      error: 'Enter a valid URL',
    })
    .nullish(),
  textTitle: z.string().nullish(),
  textContent: z.string().nullish(),
});

export const onboardingStep4Schema = z.object({
  deliverables: z
    .object({
      id: z.uuid(),
      name: z.string(),
      kind: z.string(),
      isCustom: z.boolean(),
    })
    .array()
    .min(1)
    .openapi({
      example: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Word report',
          kind: 'word_report',
          isCustom: false,
        },
      ],
    }),
});

export const onboardingStep5Schema = z.object({
  taskIds: z
    .uuid()
    .array()
    .min(3, {
      error: 'Please select at least 3 tasks to start the project.',
    })
    .openapi({
      example: ['Review interviews', 'Analyze pricing', 'Generate SWOT'],
    }),
  newTasks: z
    .object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000).nullish(),
    })
    .array()
    .optional()
    .openapi({
      example: [
        {
          name: 'Conduct market survey',
          description:
            'Design and distribute a survey to gather insights from potential customers.',
        },
      ],
    }),
});

export const onboardingDataSchema = z.object({
  step1: onboardingStep1Schema,
  step2: onboardingStep2Schema,
  step3: onboardingStep3Schema,
  step4: onboardingStep4Schema,
  step5: onboardingStep5Schema,
});

export const onboardingStateSchema = z
  .object({
    id: idSchema,
    status: onboardingStatusSchema,
    step: z.number().int().min(1).max(5).default(1),
    projectId: idSchema,
    aiRunId: idSchema.nullish(),
    stepData: onboardingDataSchema.partial().default({}),
    ...timestampSchema,
  })
  .openapi('OnboardingState');

// Saving a step validates `data` against that step's schema.
export const updateOnboardingSchema = z
  .discriminatedUnion('step', [
    z.object({
      step: z.literal(1),
      data: onboardingStep1Schema,
    }),
    z.object({
      step: z.literal(2),
      data: onboardingStep2Schema,
    }),
    z.object({
      step: z.literal(3),
      data: onboardingStep3Schema,
    }),
    z.object({
      step: z.literal(4),
      data: onboardingStep4Schema,
    }),
    z.object({
      step: z.literal(5),
      data: onboardingStep5Schema,
    }),
  ])
  .openapi('UpdateOnboarding');

export const onboardingIdQuerySchema = z.object({
  onboardingId: idSchema.openapi({
    param: { name: 'onboardingId', in: 'query' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const projectOnboardingParamsSchema = z.object({
  projectId: idSchema.openapi({
    param: { name: 'projectId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
  onboardingId: idSchema.openapi({
    param: { name: 'onboardingId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const createProjectSchema = projectSchema.pick({
  name: true,
  slug: true,
  status: true,
  description: true,
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectListSchema = z.array(projectSchema).openapi('Projects');
