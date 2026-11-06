import { tavily } from '@tavily/core';

import { env } from '../../../../env';
import { ResearchProviderError } from './errors';

export const getClient = () => {
  const apiKey = env.TAVILY_API_KEY;
  // Without a key the SDK does not fail — it silently switches to Tavily's keyless free mode,
  // which has much tighter limits. Fail loudly instead, so a missing key is never mistaken
  // for a rate-limit problem later.
  if (!apiKey) {
    throw new ResearchProviderError({ kind: 'config', message: 'TAVILY_API_KEY is not set' });
  }
  return tavily({ apiKey });
};
