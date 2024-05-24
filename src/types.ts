import { Stopwatch } from '@sapphire/stopwatch';
import { LogLevel } from '@sapphire/framework';

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
  botAdmins: string[];
  alertChannel: {
    guildId: string;
    channelId: string;
  } | null;
}

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

declare module '@sapphire/pieces' {
  interface Container {
    onlineWatch: Stopwatch;
    processWatch: Stopwatch;
    appConfig: DataBaseDriver<Config>;
    appStore: {
      messagesStore: DataBaseDriver<MessagesStoreData>;
    }
  }
}
