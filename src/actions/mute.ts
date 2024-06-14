import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { deleteMessagesFromUser } from '../lib/discordOps';
import { updateGuildCacheItem } from '../store/GuildCacheStore';

class MuteAction implements Action {
  public name = 'mute';
  public reason?: string;
  public params?: Action['params'];
  private duration: number;
  private deleteMessagesInterval?: number;

  public constructor(reason?: string, params?: Action['params']) {
    this.reason = reason ?? 'no reason.';
    this.params = params;

    if (params?.duration && Number.isSafeInteger(params.duration)) {
      this.duration = Number(params.duration) > 0 ? Number(params.duration) : 60000;
    } else {
      // The class is also instantiated during the init phase where logger doesn't exist yet
      container.logger?.info('No valid duration provided for mute action, using 1 minute.');
      this.duration = 60000;
    }

    if (params?.deleteMessagesInterval && Number.isSafeInteger(params.deleteMessagesInterval)) {
      this.deleteMessagesInterval =
        Number(params.deleteMessagesInterval) > 0 ? Number(params.deleteMessagesInterval) : 15000;
    }
  }

  public async run(message: Message) {
    container.logger.debug(
      `Muting user ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}]\nReason: ${this.reason}\nDuration: ${new DurationFormatter().format(this.duration)}`,
    );

    if (!message.member?.moderatable) {
      throw new Error(
        `Cannot mute member ${message.author.username}[${message.author.id}] in ${message.guild!.name}[${message.guild!.id}]`,
      );
    }

    await message.member!.timeout(this.duration, this.reason);
    if (this.deleteMessagesInterval) {
      await deleteMessagesFromUser(
        message.guildId!,
        message.author.id,
        this.deleteMessagesInterval,
      );
    }

    const msg = `User ${message.author.username} has been muted for ${new DurationFormatter().format(this.duration)}\nReason: ${this.reason}`;

    await message.channel.send(msg);

    await container.appStore.actionRegistryStore.update((data) =>
      updateGuildCacheItem(data.cache, message.guildId!, message.author.id, {
        policyId: this.params?.policyId.toString() ?? 'unknown',
        guildId: message.guildId!,
        authorId: message.author.id,
        username: message.author.username,
        action: {
          name: this.name,
          message: msg,
        },
        createdTimestamp: Date.now(),
      }),
    );

    return true;
  }
}

export default MuteAction;
