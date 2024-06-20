import { Action } from '../types';
import { DiscordAPIError, Message, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import BaseAction from '../lib/BaseAction';
import { recordTotalBanScore } from '../lib/recordTotalBanScore';

class BanAction extends BaseAction {
  public name = 'ban';

  private deleteMessageSeconds?: number;
  private readonly banCooldown = 120_000;

  public constructor(reason?: string, params?: Action['params']) {
    super(reason, params);

    if (params?.deleteMessageSeconds && Number.isSafeInteger(params.deleteMessageSeconds)) {
      this.deleteMessageSeconds =
        Number(params.deleteMessageSeconds) > 0 ? Number(params.deleteMessageSeconds) : 0;
    }
  }

  public async run(message: Message) {
    // Do not ban the user that was already banned within banCooldown
    const actionsAgainstMember =
      container.appStore.actionRegistryStore.data.cache[message.guildId!]?.[message.author.id];
    if (Array.isArray(actionsAgainstMember && actionsAgainstMember.length > 0)) {
      const now = Date.now();
      for (let i = actionsAgainstMember.length - 1; i >= 0; i--) {
        const action = actionsAgainstMember[i];
        // The array is sorted in ascending order, so we can break early
        if (now - action.createdTimestamp > this.banCooldown) {
          break;
        }

        if (action.action.name === this.name) {
          container.logger.info(
            `User ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}] has been banned within the cooldown period. No action taken this time.`,
          );

          return true;
        }
      }
    }

    container.logger.debug(
      `Banning user ${message.author.username}[${message.author.id}] in ${message.guild?.name}[${message.guild?.id}] | ${(message.channel as TextChannel).name}\nReason: ${this.reason}`,
    );

    if (!message.member?.bannable) {
      throw new Error(
        `Cannot ban member ${message.author.username}[${message.author.id}] in ${message.guild!.name}[${message.guild!.id}]`,
      );
    }

    try {
      await message.member.ban({
        reason: this.reason,
        deleteMessageSeconds: this.deleteMessageSeconds,
      });
    } catch (e) {
      const discordError = e as DiscordAPIError;
      if (discordError.code === 10007) {
        container.logger.warn(
          `Trying to ban non-existent user ${message.member!.user.username}[${message.member!.user.id}] in ${message.member!.guild.name}[${message.member!.guild.id}]`,
        );

        return true;
      }

      throw e;
    }

    await recordTotalBanScore(message.guild!.id);

    const msg = `Tricky biscuit ${message.author.username} has been vanquished\nReason: ${this.reason}\n\nTotal number of tricky biscuits: ${container.appStore.bucketStore.data.bans![message.guild!.id]}`;

    try {
      await this.report(message, msg);
    } catch (e) {
      container.logger.error(e, 'Failed to report ban');
    }

    await this.addToRegistry(message, msg);

    return true;
  }
}

export default BanAction;
