import BaseStore from './BaseStore';
import { CacheStoreData, Timestampable } from '../types';

export const updateGuildCacheItem = <T extends Timestampable>(
  cache: CacheStoreData<T>['cache'],
  guildId: string,
  authorId: string,
  item: T,
): void => {
  if (!guildId || !authorId) {
    throw new Error('Guild and author id are required');
  }

  if (!cache[guildId]) cache[guildId] = {};
  if (!Array.isArray(cache[guildId][authorId])) cache[guildId][authorId] = [];

  cache[guildId][authorId].push(item);
};

class GuildCacheStore<T extends Timestampable> extends BaseStore<CacheStoreData<T>> {
  constructor(db: any, TTL: number, timeout: number) {
    super(db, TTL, timeout);
  }

  async flush(now: number): Promise<void> {
    if (!this.data.dirty || !this.TTL) return;

    return this.db.update((data) => {
      Object.values(data.cache).forEach((guild) => {
        for (const [authorId, entries] of Object.entries(guild)) {
          for (let i = entries.length - 1; i >= 0; i--) {
            if (now - entries[i].createdTimestamp > this.TTL!) {
              // the entries are sorted in chronological order
              // so every action past that one is also too old
              entries.splice(0, i + 1);
              break;
            }
          }

          if (entries.length === 0) {
            delete guild[authorId];
          }
        }
      });

      this.data.dirty = false;
      this.data.lastFlush = Date.now();
    });
  }
}

export default GuildCacheStore;
