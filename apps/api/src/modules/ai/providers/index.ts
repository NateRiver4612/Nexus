import { getDeepSeekClient, getOpenAI } from '../../../lib/client';
import { DeepSeekProvider } from './deepseek';
import { OpenAIProvider } from './openai';
import { TavilyProvider } from './tavily';

// One shared instance per vendor. Each is stateless — the SDK clients are created lazily
// per call — so domain code asks for the vendor provider and never touches an SDK client.
const deepseekProvider = new DeepSeekProvider(getDeepSeekClient);
const openaiProvider = new OpenAIProvider(getOpenAI);
const tavilyProvider = new TavilyProvider();

export function getDeepSeekProvider(): DeepSeekProvider {
  return deepseekProvider;
}

export function getOpenAIProvider(): OpenAIProvider {
  return openaiProvider;
}

export function getTavilyProvider(): TavilyProvider {
  return tavilyProvider;
}
