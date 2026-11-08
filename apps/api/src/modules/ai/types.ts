import type { z } from '@hono/zod-openapi';
import type { Db } from '@nexus/db';
import type { ChatCitationType, ChatStreamEvent, Usage } from '@nexus/types';

/**
 * Who is asking and where. Built by the route from the authenticated user and the conversation
 * row, never from model output, so a tool cannot be pointed at another project or user.
 */
export type ToolCall = { id: string; name: string; args: unknown };

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export type ToolDef = { name: string; description: string; parameters: z.ZodType };

export type ToolContext = {
  db: Db;
  projectId: string;
  userId: string;
  /**
   * URLs `read_url` may open this turn: every URL the user wrote in the loaded history, plus
   * every URL `web_search` returned. Mutable so tools can add to it mid-turn.
   */
  allowedUrls: Set<string>;
};

export type ToolResult = {
  /** Text handed back to the model. Treated as data, truncated by the loop. */
  content: string;
  /** Sources to show the user as citations. */
  sources?: ChatCitationType[];
};

export type Tool = {
  name: string;
  description: string;
  parameters: z.ZodType;
  /** Shown in the UI while the tool runs. */
  label: string;
  /**
   * Higher cap for the loop's result truncation (default 6000). Tools that return long text —
   * like `read_url` reading an article — opt into more, since the model needs the whole page.
   */
  maxResultChars?: number;
  /** `args` have already been validated against `parameters` by the loop. */
  run(input: { ctx: ToolContext; args: unknown }): Promise<ToolResult>;
};

export type StreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; call: ToolCall } // emitted once complete, never as partial args
  | { type: 'usage'; usage: Usage }
  | { type: 'finish'; reason: 'stop' | 'tool_calls' | 'length' };

/**
 * What the chat loop yields while building one turn: the public stream events the route forwards
 * to the client, plus `usage`, which the route aggregates and persists but never streams.
 */
export type ChatLoopEvent = ChatStreamEvent | { type: 'usage'; usage: Usage };

export type ChatInput = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * Retry budget for transient provider failures. Queued workflows leave it unset (0) so
   * BullMQ owns their attempts/backoff; synchronous chat opts in so a 429/503 doesn't end the turn.
   */
  retries?: number;
};

export type AIProvider = {
  name: string;
  /** Aborting `signal` ends the stream quietly (no throw); other failures throw AIProviderError. */
  streamChat(input: ChatInput): AsyncIterable<StreamEvent>;
  generateText(input: Omit<ChatInput, 'tools'>): Promise<{ text: string; usage: Usage }>;
};

export type WebSearchInput = { query: string; maxResults?: number };

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string | null;
  score: number | null;
  favicon: string | null;
};

/** The abstract web search provider the chat tool depends on, so Tavily stays swappable. */
export type WebSearchProvider = {
  name: string;
  search(input: WebSearchInput): Promise<WebSearchResult[]>;
};

export type WebExtractInput = { urls: string[]; focus?: string };

export type WebExtractResult = {
  pages: { url: string; content: string }[];
  failed: { url: string; reason: string }[];
};

/** The abstract page-reading provider the chat tool depends on, so Tavily stays swappable. */
export type WebExtractProvider = {
  name: string;
  extract(input: WebExtractInput): Promise<WebExtractResult>;
};

type TokenLogprob = {
  token: string;
  logprob: number;
  bytes: number[] | null;
  top_logprobs: { token: string; logprob: number; bytes: number[] | null }[];
};

export type DeepSeekToolCallDelta = {
  index: number;
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string };
};

export type DeepSeekChunk = {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: {
    index: number;
    delta: {
      role?: 'assistant';
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: DeepSeekToolCallDelta[];
    };
    logprobs?: { content: TokenLogprob[] | null; reasoning_content?: TokenLogprob[] | null } | null;
    finish_reason:
      'stop' | 'length' | 'content_filter' | 'tool_calls' | 'insufficient_system_resource' | null; // null on every chunk except the last content chunk
  }[];
  // not in your example, but sent on the final chunk when include_usage is on (choices is empty there)
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
};

/**
 * Declares a tool with typed args. The loop validates `args` before calling `run`, so the
 * cast on the way out is safe; it only erases the generic so tools fit in one array.
 */
export function defineTool<P extends z.ZodType>(tool: {
  name: string;
  description: string;
  parameters: P;
  label: string;
  maxResultChars?: number;
  run(input: { ctx: ToolContext; args: z.infer<P> }): Promise<ToolResult>;
}): Tool {
  return { ...tool, run: ({ ctx, args }) => tool.run({ ctx, args: args as z.infer<P> }) };
}
