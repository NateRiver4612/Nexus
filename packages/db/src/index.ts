import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

type DbInstance = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { nexusDb?: DbInstance };

function createDb() {
  const url = process.env.DATABASE_URL!;
  const client = postgres(url, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

export function getDb() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForDb.nexusDb) {
    globalForDb.nexusDb = createDb();
  }
  return globalForDb.nexusDb;
}

export type DbClient = PostgresJsDatabase<typeof schema>;
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];

export type Db = DbInstance | DbTransaction;

export * from './schema';

export { schema };
