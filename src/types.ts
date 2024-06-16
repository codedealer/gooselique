import { Stopwatch } from '@sapphire/stopwatch';
import { BucketScope, LogLevel, PreconditionContext } from '@sapphire/framework';
import OpenAI from 'openai';
import { Message } from 'discord.js';
import { isObject } from '@sapphire/utilities';

export interface Flushable {
  lastFlush: number;
  dirty: boolean;
}

export interface DataBaseDriver<T> {
  data: T;
  read(): Promise<void>;
  write(): Promise<void>;
  update(fn: (data: T) => unknown): Promise<void>;
}

export interface FlushableDataBaseDriver<T extends Flushable> extends DataBaseDriver<T> {
  flush(now: number): Promise<void>;
  destroy(): void;
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
    messages: StoreConfig;
    actionRegistry: StoreConfig;
    bucket: {
      path: string;
    };
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
      enabled?: boolean;
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
      cooldown: number;
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

export interface Timestampable {
  createdTimestamp: number;
}

export interface CacheMessage extends Timestampable {
  id: string;
  authorId: string;
  channelId: string;
  guildId: string;
  content: string;
}

type GuildAuthorCache<T> = Record<string, T[]>;
type GuildCache<T> = Record<string, GuildAuthorCache<T>>;

export interface CacheStoreData<T extends Timestampable> extends Flushable {
  cache: GuildCache<T>;
}

export interface ActionRegistryItem extends Timestampable {
  policyId: string;
  guildId: string;
  authorId: string;
  username: string;
  action: {
    name: string;
    message?: string;
  };
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

export interface PersistentBucket {
  bans?: {
    [key: string]: number;
  };
}

export interface PreconditionErrorContext extends PreconditionContext {
  type: 'PreconditionErrorContext';
  silent: boolean;
  ephemeral: boolean;
  alert: boolean;
}

export const isPreconditionErrorContext = (
  context: unknown,
): context is PreconditionErrorContext => {
  return isObject(context) && 'type' in context && context.type === 'PreconditionErrorContext';
};

declare module '@sapphire/pieces' {
  interface Container {
    onlineWatch: Stopwatch;
    processWatch: Stopwatch;
    appConfig: DataBaseDriver<Config>;
    appStore: {
      messagesStore: FlushableDataBaseDriver<CacheStoreData<CacheMessage>>;
      actionRegistryStore: FlushableDataBaseDriver<CacheStoreData<ActionRegistryItem>>;
      bucketStore: DataBaseDriver<PersistentBucket>;
    };
    chat: {
      client?: OpenAI;
      prompt?: DataBaseDriver<Prompt>;
    };
    actions: Record<string, new (reason?: string, params?: Action['params']) => Action>;
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    GuildOrBotAdmin: never;
  }
}
