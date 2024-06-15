import { container } from '@sapphire/framework';
import {
  CacheType,
  Channel,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
} from 'discord.js';
import { isTextChannel } from '@sapphire/discord.js-utilities';
import { PreconditionErrorContext } from '../types';

export const deleteMessagesFromUser = async (guildId: string, userId: string, interval: number) => {
  const cache = container.appStore.messagesStore.data.cache;
  if (!cache[guildId] || !Array.isArray(cache[guildId][userId])) return;

  const entries = cache[guildId][userId];
  const channelIds = new Set<string>();
  const messages = new Map<string, string[]>();

  const now = Date.now();

  entries
    .filter((entry) => now - entry.createdTimestamp <= interval)
    .forEach((entry) => {
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

export const handleCommandError = (
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      content: 'An error occurred while processing this command',
      allowedMentions: { users: [interaction.user.id], roles: [] },
    });
  }

  return interaction.reply({
    content: 'An error occurred while processing this command',
    allowedMentions: { users: [interaction.user.id], roles: [] },
    ephemeral: true,
  });
};

export const handleCommandDenial = (
  message: string,
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      content: message,
      allowedMentions: { users: [interaction.user.id], roles: [] },
    });
  }

  return interaction.reply({
    content: message,
    allowedMentions: { users: [interaction.user.id], roles: [] },
    ephemeral: true,
  });
};

export const handlePreconditionError = (
  message: string,
  context: PreconditionErrorContext,
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  if (context.silent) return;

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      content: message,
      allowedMentions: { users: [interaction.user.id], roles: [] },
    });
  }

  const reply = context.alert ? `${message}\nThis incident will be reported` : message;

  return interaction.reply({
    content: reply,
    allowedMentions: { users: [interaction.user.id], roles: [] },
    ephemeral: context.ephemeral,
  });
};
