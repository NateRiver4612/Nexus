import type { ResearchProviderType } from '@nexus/types';

import type { WebExtractProvider, WebSearchProvider } from '../../types';
import { extract } from './extract';
import { pollResearch, startResearch } from './research';
import { search } from './search';

type TavilyProvider = ResearchProviderType & WebSearchProvider & WebExtractProvider;

// The client is built lazily per call, so one shared instance is safe.
export const tavilyProvider: TavilyProvider = {
  name: 'tavily',
  search,
  extract,
  startResearch,
  pollResearch,
};
