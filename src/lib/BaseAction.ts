import { Action } from '../types';
import { Message } from 'discord.js';
import { container } from '@sapphire/framework';
import { updateGuildCacheItem } from '../store/GuildCacheStore';

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
}

export default BaseAction;
