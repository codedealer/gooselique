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
      try {
        const userOption = interaction.options.getUser('user');
        if (!userOption) {
          return interaction.reply({
            content: 'Invalid user',
            ephemeral: true,
          });
        }

        await interaction.deferReply();

        member = await interaction.guild!.members.fetch(userOption.id);
      } catch (e) {
        this.container.logger.error(e, 'Failed to fetch member when handling vanquish command');

        return interaction.followUp({
          content: 'Failed to fetch member',
          ephemeral: true,
        });
      }
    } else {
      member = memberOrRawData;
    }

    try {
      await this.vanquish(member);
    } catch (e) {
      this.container.logger.error(e, 'Failed to vanquish member');

      return replyOrEdit(interaction, 'Failed to vanquish member', true);
    }

    return this.replyVanquished(interaction, member.user.username);
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    let member: GuildMember;

    try {
      await interaction.deferReply();

      member = await interaction.guild!.members.fetch(interaction.targetId);

      if (!member) {
        return interaction.editReply({
          content: 'Member not found',
        });
      }
    } catch (e) {
      this.container.logger.error(e, 'Failed to fetch member when handling vanquish command');

      return interaction.editReply({
        content: 'Failed to fetch member',
      });
    }

    try {
      await this.vanquish(member);
    } catch (e) {
      if ((e as Error).message === 'VANQUISH_MEMBER_NOT_BANNABLE') {
        this.container.logger.warn(
          `Member ${member.user.username}[${member.user.id}] in ${member.guild.name}[${member.guild.id}] cannot be banned`,
        );

        return replyOrEdit(interaction, 'Member cannot be banned', true);
      }
      this.container.logger.error(e, 'Failed to vanquish member');

      return replyOrEdit(interaction, 'Failed to vanquish member', true);
    }

    return this.replyVanquished(interaction, member.user.username);
  }

  private async vanquish(member: GuildMember) {
    if (!member) {
      return;
    }
    if (!member.bannable) {
      throw new Error('VANQUISH_MEMBER_NOT_BANNABLE');
    }

    this.container.logger.debug(
      `Vanquishing user ${member.user.username}[${member.user.id}] in ${member.guild.name}[${member.guild.id}] via command`,
    );

    await member.ban({
      reason: 'Vanquish command',
      deleteMessageSeconds: Time.Day,
    });

    await recordTotalBanScore(member.guild.id);
  }

  private async replyVanquished(
    interaction: Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction,
    name: string,
  ) {
    const content = `Tricky biscuit ${name} has been vanquished\n\nTotal number of tricky biscuits: ${this.container.appStore.bucketStore.data.bans![interaction.guild!.id]}`;

    return replyOrEdit(interaction, content, false);
  }
}
