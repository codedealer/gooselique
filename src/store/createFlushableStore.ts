import { DataBaseDriver, Flushable, FlushableDataBaseDriver, StoreConfig } from '../types';

export const createFlushableStore = async <T extends Flushable>(
  constructor: new (
    db: DataBaseDriver<T>,
    TTL: number,
    timeout: number,
  ) => FlushableDataBaseDriver<T>,
  config: StoreConfig,
  defaultStore: T,
): Promise<FlushableDataBaseDriver<T>> => {
  if (config.driver === 'json' && !config.path) {
    throw new Error('Selected driver is json but no path was provided in the config');
  }

  const { Low } = await import('lowdb');
  let db: DataBaseDriver<T>;
  if (config.driver === 'json') {
    const { JSONFile } = await import('lowdb/node');
    db = new Low<T>(new JSONFile(config.path), defaultStore);
  } else {
    const { Memory } = await import('lowdb');
    db = new Low<T>(new Memory(), defaultStore);
  }

  await db.read();

  return new constructor(db, config.TTL, config.flushInterval);
};
