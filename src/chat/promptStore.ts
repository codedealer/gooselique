import { Prompt } from '../types';

const promptStoreFactory = async (path: string) => {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');

  const db = new Low<Prompt>(new JSONFile(path), {});

  await db.read();

  return db;
};

export default promptStoreFactory;
