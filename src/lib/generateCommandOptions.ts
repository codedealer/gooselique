import { Command, container } from '@sapphire/framework';

export const generateCommandOptions = (name: string): Command.Options => {
  const commandConfig = container.appConfig.data.commands[name];
  if (!commandConfig) return {};

  return {
    cooldownDelay: commandConfig.cooldownDelay,
    cooldownLimit: commandConfig.cooldownLimit,
    cooldownFilteredUsers: commandConfig.cooldownFilteredUsers,
    cooldownScope: commandConfig.coolDownScope,
  };
};
