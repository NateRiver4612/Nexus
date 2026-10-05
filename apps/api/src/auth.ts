import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { accounts, getDb, sessions, users, verifications } from '@nexus/db';

const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: { users, sessions, accounts, verifications },
  }),
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001/api/auth',
  trustedOrigins: process.env.WEB_BASE_URL ? [process.env.WEB_BASE_URL] : ['http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day in seconds
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    cookiePrefix: 'nexus',
  },
});

export default auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
