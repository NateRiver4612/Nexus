import type {
  ResearchPollType,
  ResearchProviderType,
  StartResearchParamsType,
  StartResearchResultType,
} from '@nexus/types';

import type {
  WebExtractInput,
  WebExtractProvider,
  WebExtractResult,
  WebSearchInput,
  WebSearchProvider,
  WebSearchResult,
} from '../../types';
import { extract as extractPages } from './extract';
import { pollResearch as pollResearchTask, startResearch as startResearchTask } from './research';
import { search as searchWeb } from './search';

/** Tavily backs research, web search and page extraction in one provider. */
export class TavilyProvider implements ResearchProviderType, WebSearchProvider, WebExtractProvider {
  readonly name = 'tavily';

  search(input: WebSearchInput): Promise<WebSearchResult[]> {
    return searchWeb(input);
  }

  extract(input: WebExtractInput): Promise<WebExtractResult> {
    return extractPages(input);
  }

  startResearch(params: StartResearchParamsType): Promise<StartResearchResultType> {
    return startResearchTask(params);
  }

  pollResearch(params: { requestId: string }): Promise<ResearchPollType> {
    return pollResearchTask(params);
  }
}
