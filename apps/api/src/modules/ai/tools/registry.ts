import { env } from '../../../env';
import type { Tool } from '../types';
import { askUserTool } from './askUser';
import { createArtifactTool } from './createArtifact';
import { getProjectOverviewTool } from './getProjectOverview';
import { getTaskTool } from './getTask';
import { listTasksTool } from './listTasks';
import { readArtifactTool } from './readArtifact';
import { readAttachmentTool } from './readAttachment';
import { readUrlTool } from './readUrl';
import { searchKnowledgeTool } from './searchKnowledge';
import { webSearchTool } from './webSearch';

/** Reading the flag once keeps the tool list and the system prompt in sync. */
export const webSearchEnabled = Boolean(env.TAVILY_API_KEY);

/**
 * `create_artifact` is the only write path; every other tool is read-only. `ask_user` is the
 * exception on the turn level: it ends the reply and waits for the user's answer.
 */
export const projectChatTools: Tool[] = [
  searchKnowledgeTool,
  getProjectOverviewTool,
  listTasksTool,
  getTaskTool,
  readArtifactTool,
  readAttachmentTool,
  askUserTool,
  createArtifactTool,
  // Both Tavily-backed tools are gated together: neither works without the API key.
  ...(webSearchEnabled ? [webSearchTool, readUrlTool] : []),
];
