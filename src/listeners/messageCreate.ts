import { Events, Listener } from '@sapphire/framework';
import { Message } from 'discord.js';
import { detect } from '../lib/moderator';

export class MessageCreateEvent extends Listener<typeof Events.MessageCreate> {
  public override async run(message: Message) {
    if (message.author.bot || !message.guildId) return;
    const { channelId, guildId, cleanContent: content, id, createdTimestamp, author } = message;

    const authorId = author.id;
    if (!authorId) return;

    try {
      await this.container.appStore.messagesStore.update((data) => {
        if (!data.cache[guildId]) data.cache[guildId] = {};
        if (!Array.isArray(data.cache[guildId][authorId])) data.cache[guildId][authorId] = [];

        data.cache[guildId][authorId].push({
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
        `Detected message for moderation from ${author.username}: ${content}`,
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
        }
      } catch (e) {
        this.container.logger.error(
          e,
          `Failed to run action ${cfg.action.name} for message: ${content}`,
        );
      }
    }
  }
}
