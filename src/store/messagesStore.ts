import { Config, DataBaseDriver, MessagesStoreData } from '../types';
import { Time, TimerManager } from '@sapphire/time-utilities';

const defaultStore = {
  lastFlush: 0,
  dirty: false,
  cache: {},
};

class MessagesStore implements DataBaseDriver<MessagesStoreData> {
  private readonly flushTimer: NodeJS.Timeout;

  constructor(
    private db: DataBaseDriver<MessagesStoreData>,
    private TTL: number,
    timeout: number,
  ) {
    this.data = db.data;
    this.flushTimer = TimerManager.setInterval(async () => {
      const now = Date.now();
      await this.flush(now);
    }, timeout);
  }

  data: MessagesStoreData;
  read(): Promise<void> {
    return this.db.read();
  }
  write(): Promise<void> {
    this.data.dirty = true;

    return this.db.write();
  }
  update(fn: (data: MessagesStoreData) => unknown): Promise<void> {
    this.data.dirty = true;

    return this.db.update(fn);
  }
  destory(): void {
    TimerManager.clearInterval(this.flushTimer);
  }
  async flush(now: number): Promise<void> {
    if (!this.data.dirty) return;

    return this.db.update((data) => {
      Object.values(data.cache).forEach((guild) => {
        for (const [authorId, messages] of Object.entries(guild)) {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (now - messages[i].createdTimestamp > this.TTL) {
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

const messagesStoreFactory = async (config: Config): Promise<DataBaseDriver<MessagesStoreData>> => {
  if (!config.persistence.messages.path) {
    throw new Error('No messages path provided in config');
  }

  const { Low } = await import('lowdb');
  let db: DataBaseDriver<MessagesStoreData>;
  if (config.persistence.messages.driver === 'json') {
    const { JSONFile } = await import('lowdb/node');
    db = new Low<MessagesStoreData>(new JSONFile(config.persistence.messages.path), defaultStore);
  } else {
    const { Memory } = await import('lowdb');
    db = new Low<MessagesStoreData>(new Memory(), defaultStore);
  }

  await db.read();

  return new MessagesStore(
    db,
    config.persistence.messages.TTL > 0 ? config.persistence.messages.TTL : Time.Minute * 10,
    config.persistence.messages.flushInterval > 0
      ? config.persistence.messages.flushInterval
      : Time.Minute * 10,
  );
};

export default messagesStoreFactory;
