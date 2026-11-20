'use client';

import { createContext, useContext } from 'react';

export type ChatSendContextType = {
  /** Sends text as the next user message. */
  send: (content: string) => void;
  /** True while a reply is streaming, so cards wait for the turn to finish. */
  disabled: boolean;
};

export const ChatSendContext = createContext<ChatSendContextType | null>(null);

export const useChatSend = () => {
  const value = useContext(ChatSendContext);

  if (!value) {
    throw new Error('useChatSend must be used inside ChatSendContext.Provider.');
  }

  return value;
};
