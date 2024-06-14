import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import BaseAction from '../lib/BaseAction';
import { recordTotalBanScore } from '../lib/recordTotalBanScore';

class BanAction extends BaseAction {
  public name = 'ban';

  private deleteMessageSeconds?: number;

  public constructor(reason?: string, params?: Action['params']) {
    super(reason, params);

    if (params?.deleteMessageSeconds && Number.isSafeInteger(params.deleteMessageSeconds)) {
      this.deleteMessageSeconds =
        Number(params.deleteMessageSeconds) > 0 ? Number(params.deleteMessageSeconds) : 0;
    }
  }

  public async run(message: Message) {
    container.logger.debug(
      `Banning user ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}]\nReason: ${this.reason}`,
    );

    if (!message.member?.bannable) {
      throw new Error(
        `Cannot ban member ${message.author.username}[${message.author.id}] in ${message.guild!.name}[${message.guild!.id}]`,
      );
    }

    await message.member.ban({
      reason: this.reason,
      deleteMessageSeconds: this.deleteMessageSeconds,
    });

    await recordTotalBanScore(message.guild!.id);

    const msg = `Tricky biscuit ${message.author.username} has been vanquished\nReason: ${this.reason}\n\nTotal number of tricky biscuits: ${container.appStore.bucketStore.data.bans![message.guild!.id]}`;

    await message.channel.send(msg);

    await this.addToRegistry(message, msg);

    return true;
  }
}

export default BanAction;
