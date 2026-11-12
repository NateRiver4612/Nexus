import OpenAI from 'openai';
import { env } from '../env';
import type { AITaskType } from '@nexus/types';

const globalForOpenAI = globalThis as unknown as { nexusOpenAI?: OpenAI; nexusDeepSeek?: OpenAI };

export function getOpenAI() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForOpenAI.nexusOpenAI) {
    globalForOpenAI.nexusOpenAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return globalForOpenAI.nexusOpenAI;
}

export function getDeepSeekClient() {
  if (!globalForOpenAI.nexusDeepSeek) {
    globalForOpenAI.nexusDeepSeek = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      // Default 0: queued jobs are retried by BullMQ (see queues.ts), so the SDK must not
      // silently re-send and double up attempts. Chat retries transient open-request
      // failures itself, via ChatInput.retries.
      maxRetries: 0,
      timeout: env.AI_RUN_TIMEOUT_MS,
    });
  }
  return globalForOpenAI.nexusDeepSeek;
}

const MODELS: Record<AITaskType, string> = {
  rewrite: 'deepseek-v4-flash',
  summarize: 'deepseek-v4-flash',
  classify: 'deepseek-v4-flash',
  'project-chat': 'deepseek-v4-pro',
  kickoff: 'deepseek-v4-pro',
  research: 'deepseek-v4-pro',
  'artifact-generation': 'deepseek-v4-pro',
  'project-health': 'deepseek-v4-pro',
};

export function modelForTask(task: AITaskType): string {
  return MODELS[task];
}
