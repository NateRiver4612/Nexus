import { env } from '../../../env';
import type { Tool } from '../types';
import { getProjectOverviewTool } from './getProjectOverview';
import { getTaskTool } from './getTask';
import { listTasksTool } from './listTasks';
import { searchKnowledgeTool } from './searchKnowledge';
import { webSearchTool } from './webSearch';

/** Reading the flag once keeps the tool list and the system prompt in sync. */
export const webSearchEnabled = Boolean(env.TAVILY_API_KEY);

/** Every tool is read-only in v1. The only write path is the artifact approval card (Step 7). */
export const projectChatTools: Tool[] = [
  searchKnowledgeTool,
  getProjectOverviewTool,
  listTasksTool,
  getTaskTool,
  ...(webSearchEnabled ? [webSearchTool] : []),
];
