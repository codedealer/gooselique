import { DataBaseDriver, FlushableDataBaseDriver, MessagesStoreData, StoreConfig } from '../types';
import { Time } from '@sapphire/time-utilities';
import BaseStore from './baseStore';

const defaultStore = {
  lastFlush: 0,
  dirty: false,
  cache: {},
};

class MessagesStore extends BaseStore<MessagesStoreData> {
  constructor(db: DataBaseDriver<MessagesStoreData>, TTL: number, timeout: number) {
    super(db, TTL, timeout);
  }

  async flush(now: number): Promise<void> {
    if (!this.data.dirty || !this.TTL) return;

    return this.db.update((data) => {
      Object.values(data.cache).forEach((guild) => {
        for (const [authorId, messages] of Object.entries(guild)) {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (now - messages[i].createdTimestamp > this.TTL!) {
              // the messages are sorted in chronological order
              // so every message past that one is also too old
              messages.splice(0, i + 1);
              break;
            }
          }

          if (messages.length === 0) {
            delete guild[authorId];
          }
        }
      });

      this.data.dirty = false;
      this.data.lastFlush = Date.now();
    });
  }
}

const messagesStoreFactory = async (
  config: StoreConfig,
): Promise<FlushableDataBaseDriver<MessagesStoreData>> => {
  if (config.driver === 'json' && !config.path) {
    throw new Error('No messages path provided in config');
  }

  const { Low } = await import('lowdb');
  let db: DataBaseDriver<MessagesStoreData>;
  if (config.driver === 'json') {
    const { JSONFile } = await import('lowdb/node');
    db = new Low<MessagesStoreData>(new JSONFile(config.path), defaultStore);
  } else {
    const { Memory } = await import('lowdb');
    db = new Low<MessagesStoreData>(new Memory(), defaultStore);
  }

  await db.read();

  return new MessagesStore(
    db,
    config.TTL > 0 ? config.TTL : Time.Minute * 10,
    config.flushInterval > 0 ? config.flushInterval : Time.Minute * 10,
  );
};

export default messagesStoreFactory;
