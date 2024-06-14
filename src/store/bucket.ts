import { Config, PersistentBucket } from '../types';

const loadBucket = async (config: Config['persistence']['bucket']) => {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');

  const bucket = new Low<PersistentBucket>(new JSONFile(config.path), {});

  await bucket.read();

  return bucket;
};

export default loadBucket;
