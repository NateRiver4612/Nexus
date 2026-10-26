import type { z } from '@hono/zod-openapi';

export type ToolCall = { id: string; name: string; args: unknown };

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export type ToolDef = { name: string; description: string; parameters: z.ZodType };

export type Usage = { inputTokens: number; outputTokens: number };

export type StreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; call: ToolCall } // emitted once complete, never as partial args
  | { type: 'usage'; usage: Usage }
  | { type: 'finish'; reason: 'stop' | 'tool_calls' | 'length' };

export type ChatInput = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  maxTokens?: number;
  signal?: AbortSignal;
};

export type AIProvider = {
  name: string;
  /** Aborting `signal` ends the stream quietly (no throw); other failures throw AIProviderError. */
  streamChat(input: ChatInput): AsyncIterable<StreamEvent>;
  generateText(input: Omit<ChatInput, 'tools'>): Promise<{ text: string; usage: Usage }>;
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
