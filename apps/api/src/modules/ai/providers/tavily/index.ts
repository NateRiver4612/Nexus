import type { ResearchProviderType } from '@nexus/types';

import type { WebSearchProvider } from '../../types';
import { pollResearch, startResearch } from './research';
import { search } from './search';

type TavilyProvider = ResearchProviderType & WebSearchProvider;

// The client is built lazily per call, so one shared instance is safe.
export const tavilyProvider: TavilyProvider = {
  name: 'tavily',
  search,
  startResearch,
  pollResearch,
};
