import { Command } from '@sapphire/framework';
import { generateCommandOptions } from '../lib/generateCommandOptions';
import { ApplicationCommandType, GuildMember } from 'discord.js';
import { Time } from '@sapphire/time-utilities';
import { recordTotalBanScore } from '../lib/recordTotalBanScore';
import { replyOrEdit } from '../lib/discordOps';

export class VanquishCommand extends Command {
  public constructor(context: Command.LoaderContext) {
    super(context, {
      name: 'vanquish',
      ...generateCommandOptions('vanquish'),
      preconditions: ['GuildOrBotAdmin'],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    const commandConfig = this.container.appConfig.data.commands;
    const guildIds = this.name in commandConfig ? commandConfig[this.name].guilds : undefined;

    registry.registerChatInputCommand(
      (builder) => {
        return builder
          .setName(this.name)
          .setDescription('Vanquish a tricky biscuit')
          .addUserOption((option) => {
            return option
              .setName('user')
              .setDescription('The tricky biscuit to vanquish')
              .setRequired(true);
          });
      },
      {
        guildIds,
      },
    );

    registry.registerContextMenuCommand(
      {
        name: this.name,
        type: ApplicationCommandType.User,
      },
      {
        guildIds,
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const memberOrRawData = interaction.options.getMember('user');
    if (!memberOrRawData) {
      return interaction.reply({
        content: 'Invalid user',
        ephemeral: true,
      });
    }

    let member: GuildMember;
    if (!('bannable' in memberOrRawData)) {
      const userOption = interaction.options.getUser('user');
      if (!userOption) {
        return interaction.reply({
          content: 'Invalid user',
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      member = await interaction.guild!.members.fetch(userOption.id);
    } else {
      member = memberOrRawData;
    }

    return this.vanquish(interaction, member);
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    let member: GuildMember;

    await interaction.deferReply({
      ephemeral: true,
    });

    member = await interaction.guild!.members.fetch(interaction.targetId);

    if (!member) {
      return interaction.editReply({
        content: 'Member not found',
      });
    }

    return this.vanquish(interaction, member);
  }

  private async vanquish(
    interaction: Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction,
    member: GuildMember,
  ) {
    if (!member) {
      this.container.logger.error('Trying to vanquish a non-existent member');

      return replyOrEdit(interaction, 'Member cannot be banned', true);
    }
    if (!member.bannable) {
      this.container.logger.warn(
        `User ${interaction.user.username} [${interaction.user.id}] tried executing vanquish command\nMember ${member.user.username}[${member.user.id}] in ${member.guild.name}[${member.guild.id}] cannot be banned`,
      );

      return replyOrEdit(interaction, 'Member cannot be banned', true);
    }

    this.container.logger.debug(
      `Vanquishing user ${member.user.username}[${member.user.id}] in ${member.guild.name}[${member.guild.id}] via command`,
    );

    await member.ban({
      reason: 'Vanquish command',
      deleteMessageSeconds: 604800,
    });

    await recordTotalBanScore(member.guild.id);

    const content = `Tricky biscuit ${member.user.username} has been vanquished\n\nTotal number of tricky biscuits: ${this.container.appStore.bucketStore.data.bans![interaction.guild!.id]}`;

    return replyOrEdit(interaction, content, false);
  }
}
