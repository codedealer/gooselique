import { CacheMessage, Config, ContentPolicyEnforcer } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import { FloodProtector } from './FloodProtector';

export const detect = async (config: Config['moderation'][0], message: Message) => {
  // Validate the config
  const entries = container.appStore.messagesStore.data.cache[message.guildId!][message.author.id];
  const channels = config.rateLimit.channels ?? 1;
  if (config.rateLimit.messages < channels) {
    container.logger.warn(
      `Invalid rate limit configuration for moderation: ${config.id}. Impossible ratio of messages to channels.`,
    );
    return false;
  }
  if (channels < 1 || config.rateLimit.messages < 1 || config.rateLimit.messages > entries.length) {
    return false;
  }

  let enforcer: ContentPolicyEnforcer;
  switch (config.policy) {
    case 'flood_protection':
      enforcer = new FloodProtector();
      break;
    default:
      container.logger.warn(`Unknown policy for moderation: ${config.id}: ${config.policy}`);
      return false;
  }

  // Find the messages from this author
  const now = message.createdTimestamp;
  const channelsSet = new Set<string>();
  const selectedEntries: CacheMessage[] = [];

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (now - entry.createdTimestamp > config.rateLimit.cooldown) break;
    if (!(await enforcer.execute(entry))) continue;

    channelsSet.add(entry.channelId);
    selectedEntries.push(entry);
  }

  if (channelsSet.size < channels) return false;
  return selectedEntries.length >= config.rateLimit.messages;
};
