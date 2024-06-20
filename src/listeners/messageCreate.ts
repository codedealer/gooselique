import { Events, Listener } from '@sapphire/framework';
import { Message, TextChannel } from 'discord.js';
import { detect } from '../lib/moderator';
import { updateGuildCacheItem } from '../store/GuildCacheStore';
import { MessageHook } from '../types';
import ImgurHook from '../hooks/imgur';
import { alert } from '../lib/discordOps';

export class MessageCreateEvent extends Listener<typeof Events.MessageCreate> {
  protected hooks: MessageHook[] = [];
  constructor(context: Listener.LoaderContext) {
    super(context);

    this.hooks = [];
    if (this.container.appConfig.data.hooks['imgur']?.enabled) {
      this.hooks.push(new ImgurHook());
    }
  }
  public override async run(message: Message) {
    if (message.author.bot || !message.guildId) return;
    const { channelId, guildId, cleanContent: content, id, createdTimestamp, author } = message;

    const authorId = author.id;
    if (!authorId) return;

    try {
      await this.container.appStore.messagesStore.update((data) => {
        updateGuildCacheItem(data.cache, guildId, authorId, {
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
      return;
    }

    // Auto moderation
    for (const cfg of this.container.appConfig.data.moderation) {
      if (!cfg.enabled) continue;

      const detected = await detect(cfg, message);
      if (!detected) continue;

      this.container.logger.info(
        `Detected message for moderation from ${author.username} in ${message.guild!.name} | ${(message.channel as TextChannel).name}: ${content}`,
      );

      try {
        // TODO: check for repeat offenses
        const ActionClass =
          cfg.action.name in this.container.actions
            ? this.container.actions[cfg.action.name]
            : null;
        if (ActionClass) {
          if (!cfg.action.params?.policyId) {
            cfg.action.params = { ...cfg.action.params, ...{ policyId: cfg.id } };
          }
          const action = new ActionClass(cfg.action.reason, cfg.action.params);
          if (!action.run) {
            throw new Error(`Action ${cfg.action.name} is missing a run method`);
          }

          const isFinal = await action.run(message);

          if (isFinal) return;
        } else {
          this.container.logger.warn(`Action ${cfg.action.name} not found`);
          void alert(`Action ${cfg.action.name} not found`);
        }
      } catch (e) {
        this.container.logger.error(
          e,
          `[${cfg.id}] Failed to run action ${cfg.action.name} on ${author.username} in ${message.guild!.name} | ${(message.channel as TextChannel).name} for message: ${content}`,
        );
        void alert(
          `Failed to run action ${cfg.action.name} on ${author.username} in ${message.guild!.name} | ${(message.channel as TextChannel).name}`,
        );
      }
    }

    for (const hook of this.hooks) {
      try {
        const config = this.container.appConfig.data.hooks[hook.name];

        if (config && Array.isArray(config.guilds) && !config.guilds.includes(message.guildId))
          continue;

        if (await hook.run(message)) break;
      } catch (e) {
        this.container.logger.error(e, `Failed to run hook ${hook.name} in ${message.guild!.name}`);
        void alert(`Failed to run hook ${hook.name}`);
      }
    }
  }
}
