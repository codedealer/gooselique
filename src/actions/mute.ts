import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { deleteMessagesFromUser } from '../lib/discordOps';

class MuteAction implements Action {
  public name = 'mute';
  public reason?: string;
  public params?: Action['params'];
  private duration: number;

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
  }

  public async run(message: Message) {
    const reply = `Muting user ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}] for ${this.reason}\nDuration: ${new DurationFormatter().format(this.duration)}`;
    container.logger.debug(reply);

    if (message.member?.kickable) {
      container.logger.debug(
        `User ${message.author.username}[${message.author.id}] can be kicked out`,
      );
    } else {
      container.logger.debug(
        `User ${message.author.username}[${message.author.id}] cannot be kicked out`,
      );
    }

    if (!message.member?.moderatable) {
      throw new Error(
        `Cannot mute member ${message.author.username}[${message.author.id}] in ${message.guild!.name}[${message.guild!.id}]`,
      );
    }

    await message.member!.timeout(this.duration, this.reason);
    await deleteMessagesFromUser(message.guildId!, message.author.id);
    await message.channel.send(reply);

    return true;
  }
}

export default MuteAction;
