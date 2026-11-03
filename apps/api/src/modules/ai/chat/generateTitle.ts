import type { Usage } from '@nexus/types';

import { modelForTask } from '../../../lib/client';
import type { ConversationServiceType } from '../conversations/service';
import { CONVERSATION_TITLE_SYSTEM_PROMPT } from '../prompts/projectChat';
import type { AIProvider } from '../types';

const MAX_TITLE_CHARS = 60;

/**
 * Generates a title from the first exchange and saves it on the conversation.
 * Returns the saved title and the tokens spent, so the caller can merge them into the run.
 * Usage is returned even when only the rename fails, so tokens are still accounted for.
 */
export async function generateConversationTitle({
  provider,
  userId,
  conversationId,
  content,
  reply,
  signal,
  conversations,
}: {
  provider: AIProvider;
  userId: string;
  conversationId: string;
  content: string;
  reply: string;
  signal: AbortSignal;
  conversations: ConversationServiceType;
}): Promise<{ title?: string; usage?: Usage }> {
  let usage: Usage | undefined;

  try {
    const generated = await provider.generateText({
      model: modelForTask('summarize'),
      messages: [
        { role: 'system', content: CONVERSATION_TITLE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User: ${content}\n\nAssistant: ${reply.slice(0, 1000)}`,
        },
      ],
      maxTokens: 24,
      signal,
    });

    usage = generated.usage;

    // Strip surrounding quotes/periods and cap length:
    //   '“Auth setup help”' → 'Auth setup help'
    const cleaned = generated.text
      .trim()
      .replace(/^["'“”]+|["'“”.]+$/g, '')
      .slice(0, MAX_TITLE_CHARS);

    if (!cleaned) return { usage };

    await conversations.rename({ id: conversationId, userId, title: cleaned });

    return { title: cleaned, usage };
  } catch (err) {
    console.error('[project-chat] title generation failed', err);
    return { usage };
  }
}
