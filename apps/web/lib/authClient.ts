import { createAuthClient } from 'better-auth/client';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const authClient = createAuthClient({ baseURL: `${baseUrl}/api/auth` });
