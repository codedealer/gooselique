import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { generateCommandOptions } from '../lib/generateCommandOptions';
import { ChatInputCommandInteraction } from 'discord.js';

export class PetCommand extends Command {
  public constructor(context: Command.LoaderContext) {
    super(context, {
      name: 'pet',
      description: 'Give pets',
      ...generateCommandOptions('pet'),
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    const commandConfig = this.container.appConfig.data.commands;
    const guildIds = this.name in commandConfig ? commandConfig[this.name].guilds : undefined;

    registry.registerChatInputCommand(
      (builder) => {
        return builder.setName(this.name).setDescription(this.description);
      },
      {
        guildIds,
      },
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    await this.container.appStore.bucketStore.read();

    const petBucket = this.container.appStore.bucketStore.data.pet;

    if (!petBucket || !petBucket.default || !petBucket.default.length) {
      this.container.logger.warn(
        'Pet bucket not found. pet.default array is required to run /pet command',
      );

      return interaction.editReply({
        content: 'Pet command is not available at this time',
      });
    }

    // get random reply
    const link = petBucket.default[Math.floor(Math.random() * petBucket.default.length)];

    return interaction.editReply({
      content: link,
    });
  }
}
