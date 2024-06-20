import { Action } from '../types';
import { Message, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';
import { updateGuildCacheItem } from '../store/GuildCacheStore';
import { getChannel } from './discordOps';
import { isTextChannel } from '@sapphire/discord.js-utilities';

abstract class BaseAction implements Action {
  abstract name: string;
  params: Record<string, string | number | boolean>;
  reason: string;

  protected constructor(reason?: string, params?: Action['params']) {
    this.reason = reason ?? 'no reason.';
    this.params = params ?? {};
  }

  abstract run(message: Message): Promise<boolean>;

  protected async addToRegistry(message: Message, msg: string) {
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
  }

  protected async report(message: Message, msg: string) {
    let channel: TextChannel | null;
    if (container.appConfig.data.actions?.[this.name].reporting?.[message.guildId!]) {
      const channelId = container.appConfig.data.actions[this.name].reporting[message.guildId!];
      if (channelId) {
        const maybeChannel = await getChannel(channelId);
        if (!isTextChannel(maybeChannel)) {
          throw new Error(`Invalid reporting channel supplied for guild ${message.guildId}`);
        }

        channel = maybeChannel;
      } else {
        throw new Error(`Invalid reporting channel configuration for guild ${message.guildId}`);
      }
    } else {
      channel = message.channel as TextChannel;
    }

    await channel.send(msg);
  }
}

export default BaseAction;
