import { Command } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { generateCommandOptions } from '../lib/generateCommandOptions';

export class UptimeCommand extends Command {
  public constructor(context: Command.LoaderContext) {
    super(context, {
      name: 'uptime',
      ...generateCommandOptions('uptime'),
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    const commandConfig = this.container.appConfig.data.commands;
    const guildIds = this.name in commandConfig ? commandConfig[this.name].guilds : undefined;

    registry.registerChatInputCommand(
      (builder) => {
        return builder.setName('uptime').setDescription("Check the bot's uptime");
      },
      {
        guildIds,
      },
    );
  }

  public override chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const online = new DurationFormatter().format(Math.round(this.container.onlineWatch.duration));
    const total = new DurationFormatter().format(Math.round(this.container.processWatch.duration));
    return interaction.reply({
      content: `Online Uptime: ${online}\nBot's Uptime: ${total}`,
    });
  }
}
