import { getDeepSeekClient } from '../../../lib/client';
import type { AIProvider } from '../types';
import { DeepSeekProvider } from './deepseek';

let provider: AIProvider | undefined;

/**
 * The one place a concrete provider is chosen. Domain code asks for `getAIProvider()` and
 * never touches an SDK client, so swapping providers later is a change to this file only.
 */
export function getAIProvider(): AIProvider {
  provider ??= new DeepSeekProvider(getDeepSeekClient);
  return provider;
}
