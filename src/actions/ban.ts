import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import { updateGuildCacheItem } from '../store/GuildCacheStore';

class BanAction implements Action {
  public name = 'ban';
  public reason?: string;
  public params?: Action['params'];

  private deleteMessageSeconds?: number;

  public constructor(reason?: string, params?: Action['params']) {
    this.reason = reason ?? 'no reason.';
    this.params = params;

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

    const msg = `User ${message.author.username} has been banned\nReason: ${this.reason}`;

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

export default BanAction;
