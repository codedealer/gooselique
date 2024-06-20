import { container } from '@sapphire/framework';
import {
  CacheType,
  Channel,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  DiscordAPIError,
  TextChannel,
} from 'discord.js';
import { isTextChannel } from '@sapphire/discord.js-utilities';
import { PreconditionErrorContext } from '../types';

export const getChannel = async (channelId: string) => {
  let channel: Channel | null | undefined = container.client.channels.cache.get(channelId);
  if (!channel) {
    channel = await container.client.channels.fetch(channelId);
  }

  return channel;
};

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
    let channel: Channel | null | undefined = await getChannel(channelId);
    if (!isTextChannel(channel)) continue;

    try {
      await channel.bulkDelete(messageIds);
    } catch (e) {
      const discordError = e as DiscordAPIError;
      if (discordError.code === 10008) {
        container.logger.warn(
          `Trying to delete a non-existent message in ${channel.guild.name}[${channel.guild.id}] | ${channel.name}`,
        );

        continue;
      }

      throw e;
    }
  }
};

export const handleCommandError = (
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  void alert(`An error occurred while processing the command: ${interaction.commandName}`);

  return replyOrEdit(interaction, 'An error occurred while processing this command', true);
};

export const handleCommandDenial = (
  message: string,
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  return replyOrEdit(interaction, message, true);
};

export const handlePreconditionError = (
  message: string,
  context: PreconditionErrorContext,
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
) => {
  if (context.silent) return;

  const reply = context.alert ? `${message}\nThis incident will be reported` : message;

  if (context.alert) {
    void alert(
      `Command execution denied:\nCommand: ${interaction.commandName}\nReason: ${message}\nUser: ${interaction.user.username} [${interaction.user.id}]`,
    );
  }

  return replyOrEdit(interaction, reply, context.ephemeral);
};

export const replyOrEdit = (
  interaction: ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction<CacheType>,
  content: string,
  ephemeral: boolean,
) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({
      content,
      ephemeral,
    });
  }

  return interaction.reply({
    content,
    ephemeral,
  });
};

export const alert = async (message: string) => {
  const alertChannel = container.appConfig.data.alertChannel;
  if (!alertChannel) return;

  const { channelId, guildId } = alertChannel;
  if (!channelId || !guildId) {
    container.logger.error('Invalid alert channel configuration');
    return;
  }

  const channel = await getChannel(channelId);
  if (!channel) {
    container.logger.error('Alert channel not found');
    return;
  }
  if (!channel.isTextBased) {
    container.logger.error('Alert channel is not text based');
    return;
  }

  const textChannel = channel as TextChannel;
  if (textChannel.guildId !== guildId) {
    container.logger.error('Alert channel is not in the correct guild');
    return;
  }

  try {
    await textChannel.send(message);
  } catch (e) {
    container.logger.error(e, `Failed to send alert message to ${textChannel.name}`);
  }
};
