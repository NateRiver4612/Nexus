import type { Tool } from '../types';
import { getProjectOverviewTool } from './getProjectOverview';
import { getTaskTool } from './getTask';
import { listTasksTool } from './listTasks';
import { searchKnowledgeTool } from './searchKnowledge';

/** Every tool is read-only in v1. The only write path is the artifact approval card (Step 7). */
export const projectChatTools: Tool[] = [
  searchKnowledgeTool,
  getProjectOverviewTool,
  listTasksTool,
  getTaskTool,
];
