import { hc } from 'hono/client';
import type { ClientResponse } from 'hono/client';

import type { AppType } from '@nexus/api/client';
import type { ErrorResponse } from '@nexus/types';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const apiClient = hc<AppType>(baseUrl, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: 'include' }),
});

export type ResponseData<R> = R extends ClientResponse<infer T, any, 'json'> ? T : never;

export async function handleResponse<R extends ClientResponse<any, any, 'json'>>(
  res: R,
): Promise<ResponseData<R>> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(body?.error.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}
