import { z } from 'zod';

import type { ApiError } from './contracts';
import {
  artifactSchema,
  createArtifactSchema,
  createKnowledgeItemSchema,
  createPlannerItemSchema,
  createProjectSchema,
  knowledgeItemSchema,
  notificationSchema,
  plannerItemSchema,
  projectSchema,
  updateProjectSchema,
} from './contracts';

export interface NexusClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  getToken?: () => Promise<string | null>;
}

export class NexusClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly getToken: (() => Promise<string | null>) | undefined;

  constructor(options: NexusClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetcher ?? fetch;
    this.getToken = options.getToken;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    if (this.getToken) {
      const token = await this.getToken();
      if (token) headers.set('authorization', `Bearer ${token}`);
    }

    const res = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError | Record<string, never>;
      const error = (body as ApiError).error ?? {
        type: 'ServerError',
        message: `Request failed with status ${res.status}`,
      };
      throw new ApiRequestError(error, res.status);
    }

    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private projectPath(id: string, path = '') {
    return `/v1/projects/${id}${path}`;
  }

  async createProject(input: z.infer<typeof createProjectSchema>) {
    return this.request('/v1/projects', { method: 'POST', body: JSON.stringify(input) });
  }

  async getProjects() {
    return this.request<z.infer<typeof projectSchema>[]>('/v1/projects');
  }

  async getProject(id: string) {
    return this.request<z.infer<typeof projectSchema>>(this.projectPath(id));
  }

  async updateProject(id: string, input: z.infer<typeof updateProjectSchema>) {
    return this.request<z.infer<typeof projectSchema>>(this.projectPath(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteProject(id: string) {
    return this.request<{ ok: true }>(this.projectPath(id), { method: 'DELETE' });
  }

  async getPlanner(projectId: string) {
    return this.request<z.infer<typeof plannerItemSchema>[]>(`/v1/planner/${projectId}`);
  }

  async createPlannerItem(projectId: string, input: z.infer<typeof createPlannerItemSchema>) {
    return this.request<z.infer<typeof plannerItemSchema>>(`/v1/planner/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getArtifacts(projectId: string) {
    return this.request<z.infer<typeof artifactSchema>[]>(`/v1/artifacts/${projectId}`);
  }

  async createArtifact(projectId: string, input: z.infer<typeof createArtifactSchema>) {
    return this.request<z.infer<typeof artifactSchema>>(`/v1/artifacts/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getKnowledge(projectId: string) {
    return this.request<z.infer<typeof knowledgeItemSchema>[]>(`/v1/knowledge/${projectId}`);
  }

  async createKnowledgeItem(projectId: string, input: z.infer<typeof createKnowledgeItemSchema>) {
    return this.request<z.infer<typeof knowledgeItemSchema>>(`/v1/knowledge/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getNotifications() {
    return this.request<z.infer<typeof notificationSchema>[]>('/v1/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<z.infer<typeof notificationSchema>>(`/v1/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async search(query: Record<string, string>) {
    const params = new URLSearchParams(query);
    return this.request<Array<{ type: string; id: string; title: string }>>(`/v1/search?${params}`);
  }
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: Required<ApiError>['error']['type'];

  constructor(error: ApiError['error'], status: number) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.type;
  }
}
