import { Command } from '@sapphire/framework';
import OpenAI from 'openai';
import composePrompt from '../chat/prompt';
import { userMentionRegex } from '../lib/constants';
import { processReply } from '../chat/client';
import { generateCommandOptions } from '../lib/generateCommandOptions';
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

export class AskCommand extends Command {
  public constructor(context: Command.LoaderContext) {
    super(context, {
      name: 'ask',
      ...generateCommandOptions('ask'),
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    if (!this.container.chat.client) return;

    const commandConfig = this.container.appConfig.data.commands;
    const guildIds = this.name in commandConfig ? commandConfig[this.name].guilds : undefined;

    registry.registerChatInputCommand(
      (builder) => {
        return builder
          .setName(this.name)
          .setDescription('Ask the bot a question')
          .addStringOption((option) => {
            return option
              .setName('question')
              .setDescription('What question do you want to ask?')
              .setRequired(true);
          });
      },
      {
        guildIds,
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!this.container.chat.client || !this.container.appConfig.data.chat.model) {
      return interaction.reply({
        content: 'The bot is not configured to answer questions',
        ephemeral: true,
      });
    }

    const { guildId, channelId } = interaction;
    if (!guildId || !channelId) {
      return interaction.reply({
        content: 'This command is only available in guilds',
        ephemeral: true,
      });
    }

    if (!this.canChatIn(guildId, channelId)) {
      return interaction.reply({
        content: 'This command is not available in this channel',
        ephemeral: true,
      });
    }

    let question = interaction.options.getString('question', true);
    // Replace user mentions with their display name
    question = question.replace(userMentionRegex, (match, userId: string) => {
      const user = interaction.guild?.members.cache.get(userId);
      return user ? user.displayName ?? user.user.username : match;
    });

    await interaction.deferReply();

    await this.container.chat.prompt?.read();
    const prompt = this.container.chat.prompt?.data;

    const messages: ChatCompletionMessageParam[] = composePrompt(
      {
        message: {
          role: 'user',
          content: question,
          createdTimestamp: Date.now(),
          userId: interaction.user.id,
          userName: interaction.user.username,
          displayName: interaction.user.displayName,
          channelId,
          guildId,
        },
        prompt: prompt,
      },
      this.container.appConfig.data.chat,
    );

    this.container.logger.debug(messages.at(-1), 'Creating message with OpenAI');

    try {
      // Create a message using the OpenAI client
      const response = await this.container.chat.client.chat.completions.create({
        model: this.container.appConfig.data.chat.model,
        messages,
        ...this.container.appConfig.data.chat.params,
      });

      // Extract the model's message from the response
      const aiMessage =
        Array.isArray(response.choices) && response.choices.length > 0
          ? processReply(response.choices[0])
          : null;

      // Send the model's message as a reply to the user
      return interaction.editReply(aiMessage ?? 'Sorry, I cannot answer that.');
    } catch (error) {
      this.container.logger.error(error, 'Error creating message with OpenAI');
      return interaction.editReply('Sorry, I was unable to process your question.');
    }
  }

  private canChatIn(guildId: string, channelId: string) {
    const allowChatIn = this.container.appConfig.data.chat.allowChatIn!;
    if (allowChatIn === 'all') return true;
    if (!allowChatIn[guildId]) return false;
    if (allowChatIn[guildId] === 'all') return true;
    return allowChatIn[guildId].includes(channelId);
  }
}
