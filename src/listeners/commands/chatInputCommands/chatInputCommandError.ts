import { ChatInputCommandErrorPayload, Events, Listener } from '@sapphire/framework';

export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
  public override async run(error: unknown, { interaction }: ChatInputCommandErrorPayload) {
    this.container.logger.error(
      error,
      `Error when handling a chat input command: ${interaction.commandName}`,
    );

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: 'Your command could not be processed',
      });
    }

    return interaction.reply({
      content: 'Your command could not be processed',
      ephemeral: true,
    });
  }
}
