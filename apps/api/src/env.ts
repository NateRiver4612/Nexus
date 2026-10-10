import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.url().default('redis://localhost:6379'),
  PORT: z.coerce.number().int().default(3001),
  API_BASE_URL: z.url().default('http://localhost:3001'),
  WEB_BASE_URL: z.url().default('http://localhost:3000'),
  // S3_ENDPOINT is intentionally optional: it's only for S3-compatible endpoints
  // (e.g. MinIO). When unset (the AWS-native case) the SDK derives the regional
  // AWS S3 endpoint from S3_REGION automatically.
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string(),
  // Static credentials are optional — with an IAM role / FullAccess policy the
  // AWS SDK resolves credentials automatically from its default provider chain.
  // Only set these for dev/MinIO or when not running on an instance with a role.
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  // Path-style addressing is a MinIO / S3-compatible need. AWS S3 uses
  // virtual-hosted addressing, so this stays false unless S3_ENDPOINT is set.
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  OPENAI_API_KEY: z.string().default(''),
  DEEPSEEK_API_KEY: z.string().default(''),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_KICKOFF_MODEL: z.string().default('deepseek-v4-flash'),
  AI_KICKOFF_MODE: z.string().default('deep'),
  BETTER_AUTH_SECRET: z.string().default('dev-only-secret-change-me'),
  BETTER_AUTH_URL: z.url().default('http://localhost:3001/api/auth'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment — check apps/api/.env');
}

export const env = parsed.data;
export type AppEnv = typeof env;
