import { Config } from '../types';
import { LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';

const defaultConfig: Config = {
  logs: {
    level: LogLevel.Info,
    path: false,
  },
  persistence: {
    path: '',
    messages: {
      driver: 'json',
      path: './data/messages.json',
      // How often to remove old messages
      flushInterval: Time.Minute * 10,
      // How long to keep messages for
      TTL: Time.Minute * 10,
    },
  },
  chat: {
    endpoint: null,
    model: '',
    // Can be an object where the key is the guild id and the value is an array of channel ids or 'all' for all channels in the guild
    allowChatIn: 'all',
    // Whether to include the username in the prompt before the user's message
    // Useful in multi-user chat modes
    usernameInPrompt: false,
  },
  botAdmins: [],
  alertChannel: null,
  // Can restrict commands to specific servers
  // Key is a command name, value is an options object
  commands: {},
  moderation: [
    {
      id: 'default_flood_protection',
      enabled: true,
      rateLimit: {
        channels: 1,
        messages: 4,
        cooldown: 15000,
      },
      policy: 'flood_protection',
      action: {
        name: 'mute',
        reason: 'flooding',
        params: {
          duration: 60000,
          deleteMessagesInterval: 15000,
        },
      },
    },
  ],
};

export default defaultConfig;
