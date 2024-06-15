import { ChatInputCommandErrorPayload, Events, Listener } from '@sapphire/framework';
import { handleCommandError } from '../../../lib/discordOps';

export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
  public override async run(error: unknown, { interaction }: ChatInputCommandErrorPayload) {
    this.container.logger.error(
      error,
      `Error when handling a chat input command: ${interaction.commandName}`,
    );

    return handleCommandError(interaction);
  }
}
