import { env } from './src/env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../../packages/db/src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
