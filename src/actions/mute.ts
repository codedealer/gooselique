import { Action } from '../types';
import { DiscordAPIError, Message, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { deleteMessagesFromUser } from '../lib/discordOps';
import BaseAction from '../lib/BaseAction';

class MuteAction extends BaseAction {
  public name = 'mute';
  private duration: number;
  private deleteMessagesInterval?: number;

  public constructor(reason?: string, params?: Action['params']) {
    super(reason, params);

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
      `Muting user ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}] | ${(message.channel as TextChannel).name}\nReason: ${this.reason}\nDuration: ${new DurationFormatter().format(this.duration)}`,
    );

    if (!message.member?.moderatable) {
      throw new Error(
        `Cannot mute member ${message.author.username}[${message.author.id}] in ${message.guild!.name}[${message.guild!.id}]`,
      );
    }

    try {
      await message.member!.timeout(this.duration, this.reason);
    } catch (e) {
      const discordError = e as DiscordAPIError;
      if (discordError.code === 10007) {
        container.logger.warn(
          `Trying to mute non-existent user ${message.member!.user.username}[${message.member!.user.id}] in ${message.member!.guild.name}[${message.member!.guild.id}]`,
        );

        return true;
      }

      throw e;
    }
    if (this.deleteMessagesInterval) {
      await deleteMessagesFromUser(
        message.guildId!,
        message.author.id,
        this.deleteMessagesInterval,
      );
    }

    const msg = `User ${message.author.username} has been muted for ${new DurationFormatter().format(this.duration)}\nReason: ${this.reason}`;

    await message.channel.send(msg);

    await this.addToRegistry(message, msg);

    return true;
  }
}

export default MuteAction;
