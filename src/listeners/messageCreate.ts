import { Events, Listener } from '@sapphire/framework';
import { Message } from 'discord.js';

export class MessageCreateEvent extends Listener<typeof Events.MessageCreate> {
  public override async run(message: Message) {
    if (message.author.bot || !message.guildId) return;
    const { channelId, guildId, cleanContent: content, id, createdTimestamp, author } = message;

    const authorId = author.id;
    if (!authorId) return;

    try {
      await this.container.messagesStore.update((data) => {
        if (!data.cache[guildId]) data.cache[guildId] = {};
        if (!Array.isArray(data.cache[guildId][authorId])) data.cache[guildId][authorId] = [];

        data.cache[guildId][authorId].push({
          id,
          createdTimestamp,
          content,
          authorId,
          channelId,
          guildId,
        });
      });
    } catch (e) {
      this.container.logger.error(e, 'Failed to update message store');
    }
  }
}
