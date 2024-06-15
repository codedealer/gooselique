import { ChatInputCommand, Precondition } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';

export class GuildOrBotAdmin extends Precondition {
  public override chatInputRun(
    interaction: ChatInputCommandInteraction,
    _command: ChatInputCommand,
    context: Precondition.Context,
  ): Precondition.Result {
    const botAdmins = this.container.appConfig.data.botAdmins;
    const isGuildAdmin = interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator,
    );

    if (isGuildAdmin || botAdmins.includes(interaction.user.id)) {
      return this.ok();
    }

    return this.error({
      message: "You don't have permissions to run this command",
      context: {
        ...context,
        type: 'PreconditionErrorContext',
        silent: false,
        ephemeral: true,
        alert: true,
      },
    });
  }
}
