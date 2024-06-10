import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';

class MuteAction implements Action {
  public name = 'mute';
  public reason?: string;
  public params?: Record<string, string>;

  public constructor(reason?: string, params?: Record<string, string>) {
    this.reason = reason ?? 'no reason.';
    this.params = params;
  }

  public async run(message: Message) {
    container.logger.debug(
      `Muting user ${message.author.username}[${message.author.id}] in ${message?.guild?.name}[${message?.guild?.id}] for ${this.reason}`,
    );

    return true;
  }
}

export default MuteAction;
