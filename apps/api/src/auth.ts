import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';

import { accounts, getDb, sessions, users, verifications } from '@nexus/db';
import { createAuthMiddleware } from 'better-auth/api';
import { env } from './env';

const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: { users, sessions, accounts, verifications },
    usePlural: true,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_BASE_URL],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [dash()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') {
        console.log(ctx.body);
        return;
      }
    }),
  },
  logger: {
    level: 'debug',
    log(level, message, meta) {
      console.log(`[${level}] ${message}`, meta);
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
    database: {
      generateId: 'uuid',
    },
  },
});

export default auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
