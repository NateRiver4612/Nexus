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
    });
  }
  return globalForOpenAI.nexusDeepSeek;
}

const MODELS: Record<AITaskType, string> = {
  rewrite: 'deepseek-v4-flash',
  summarize: 'deepseek-v4-flash',
  classify: 'deepseek-v4-flash',
  'project-chat': 'deepseek-v4-flash',
  kickoff: 'deepseek-v4-pro',
  research: 'deepseek-v4-pro',
  'artifact-generation': 'deepseek-v4-pro',
  'project-health': 'deepseek-v4-pro',
};

export function modelForTask(task: AITaskType): string {
  return MODELS[task];
}
