import OpenAI from 'openai';
import { Config } from '../types';
import { MessageLimits } from '@sapphire/discord.js-utilities';
import { trimSentence } from '../lib/utils';

const clientFactory = (config: Config['chat'], token: string) => {
  if (!config.endpoint) {
    throw new Error('No chat endpoint provided');
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: config.endpoint,
    maxRetries: config.maxRetries,
  });

  return client;
};

export const processReply = (reply: OpenAI.Chat.Completions.ChatCompletion.Choice) => {
  const originalContent = reply.message.content;
  if (!originalContent) return originalContent;
  if (reply.finish_reason !== 'stop' && reply.finish_reason !== 'length') return null;

  let needsTrim = false;
  if (reply.finish_reason === 'length') {
    needsTrim = true;
  }

  let content: string;
  if (originalContent.length > MessageLimits.MaximumLength) {
    needsTrim = true;
    content = originalContent.slice(0, MessageLimits.MaximumLength);
  } else {
    content = originalContent;
  }

  if (needsTrim) {
    content = trimSentence(content);
  }

  return content;
};

export default clientFactory;
