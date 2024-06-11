import { Stopwatch } from '@sapphire/stopwatch';
import { BucketScope, LogLevel } from '@sapphire/framework';
import OpenAI from 'openai';
import { Message } from 'discord.js';

export interface DataBaseDriver<T> {
  data: T;
  read(): Promise<void>;
  write(): Promise<void>;
  update(fn: (data: T) => unknown): Promise<void>;
}

export type ServerList = Record<string, string[] | 'all'> | 'all';

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
    allowChatIn?: ServerList;
    usernameInPrompt?: boolean;
    promptFile?: string;
    maxRetries?: number;
    params?: Record<string, string>;
  };
  botAdmins: string[];
  alertChannel: {
    guildId: string;
    channelId: string;
  } | null;
  commands: {
    [key: string]: {
      guilds?: string[];
      cooldownDelay?: number;
      cooldownLimit?: number;
      cooldownFilteredUsers?: string[];
      cooldownScope?: BucketScope;
    };
  };
  moderation: {
    id: string;
    enabled: boolean;
    rateLimit: {
      channels?: number;
      messages: number;
      cooldown: number;
    };
    policy: 'content_filter' | 'flood_protection';
    contentFilter?: string;
    action: Action;
    repeatedViolationAction?: {
      times: number;
      interval: number;
      action: Action;
    };
  }[];
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

export interface Action {
  name: string;
  reason?: string;
  params?: Record<string, string | number | boolean>;
  run?(message: Message): Promise<boolean>;
}

export interface ContentPolicyEnforcer {
  execute(message: CacheMessage): Promise<boolean>;
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
    actions: Record<string, new (reason?: string, params?: Action['params']) => Action>;
  }
}
