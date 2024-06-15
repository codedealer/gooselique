import { handleCommandError } from '../../../lib/discordOps';
import { ContextMenuCommandErrorPayload, Events, Listener } from '@sapphire/framework';

export class ContextMenuCommandError extends Listener<typeof Events.ContextMenuCommandError> {
  public override async run(error: unknown, { interaction }: ContextMenuCommandErrorPayload) {
    this.container.logger.error(
      error,
      `Error when handling a context menu command: ${interaction.commandName}`,
    );

    return handleCommandError(interaction);
  }
}
