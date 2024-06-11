import { container } from '@sapphire/framework';
import { Channel } from 'discord.js';
import { isTextChannel } from '@sapphire/discord.js-utilities';

export const deleteMessagesFromUser = async (guildId: string, userId: string) => {
  const cache = container.appStore.messagesStore.data.cache;
  if (!cache[guildId] || !Array.isArray(cache[guildId])) return;

  const entries = cache[guildId][userId];
  const channelIds = new Set<string>();
  const messages = new Map<string, string[]>();

  entries.forEach((entry) => {
    channelIds.add(entry.channelId);

    const m = messages.get(entry.channelId) ?? [];
    m.push(entry.id);
    messages.set(entry.channelId, m);
  });

  for (const [channelId, messageIds] of messages.entries()) {
    let channel: Channel | null | undefined = container.client.channels.cache.get(channelId);
    if (!channel) {
      channel = await container.client.channels.fetch(channelId);
    }
    if (!isTextChannel(channel)) continue;

    try {
      await channel.bulkDelete(messageIds);
    } catch (e) {
      if ((e as { code: number }).code !== 10008) throw e;
    }
  }
};
