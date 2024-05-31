import { Stopwatch } from '@sapphire/stopwatch';
import { LogLevel } from '@sapphire/framework';
import OpenAI from 'openai';

export interface DataBaseDriver<T> {
  data: T;
  read(): Promise<void>;
  write(): Promise<void>;
  update(fn: (data: T) => unknown): Promise<void>;
}

export interface StoreConfig {
  driver: 'json' | 'memory';
  path: string;
  flushInterval: number;
  TTL: number;
}

export interface Config {
  logs: {
    level: LogLevel;
    path: boolean | string;
  };
  persistence: {
    path: string;
    messages: StoreConfig;
  };
  chat: {
    endpoint: string | null;
    model?: string;
    allowChatIn?: Record<string, string[] | 'all'> | 'all';
    usernameInPrompt?: boolean;
    promptFile?: string;
  };
  botAdmins: string[];
  alertChannel: {
    guildId: string;
    channelId: string;
  } | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdTimestamp: number;
  channelId?: string;
  guildId?: string;
}

export interface UserChatMessage extends ChatMessage {
  role: 'user';
  userId: string;
  userName: string;
  displayName?: string;
}

export interface AssistantChatMessage extends ChatMessage {
  role: 'assistant';
}

export const isUserChatMessage = (message: ChatMessage): message is UserChatMessage => {
  return message.role === 'user';
};

export const isAssistantChatMessage = (message: ChatMessage): message is AssistantChatMessage => {
  return message.role === 'assistant';
};

export interface CacheMessage {
  id: string;
  authorId: string;
  channelId: string;
  guildId: string;
  content: string;
  createdTimestamp: number;
}

type GuildAuthorMessageCache = Record<string, CacheMessage[]>;
type GuildMessageCache = Record<string, GuildAuthorMessageCache>;

export interface MessagesStoreData {
  lastFlush: number;
  dirty: boolean;
  cache: GuildMessageCache;
}

export interface Prompt {
  system?: string;
  memory?: Record<string, string>;
}

declare module '@sapphire/pieces' {
  interface Container {
    onlineWatch: Stopwatch;
    processWatch: Stopwatch;
    appConfig: DataBaseDriver<Config>;
    appStore: {
      messagesStore: DataBaseDriver<MessagesStoreData>;
    };
    chat: {
      client?: OpenAI;
      prompt?: DataBaseDriver<Prompt>;
    };
  }
}
