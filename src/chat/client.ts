import OpenAI from 'openai';
import { Config } from '../types';

const clientFactory = (config: Config['chat'], token: string) => {
  if (!config.endpoint) {
    throw new Error('No chat endpoint provided');
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: config.endpoint,
  });

  return client;
};

export default clientFactory;
