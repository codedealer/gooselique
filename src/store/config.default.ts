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
      path: '../data/messages.json',
      // How often to remove old messages
      flushInterval: Time.Minute * 10,
      // How long to keep messages for
      TTL: Time.Minute * 10,
    },
  },
  botAdmins: [],
  alertChannel: null,
};

export default defaultConfig;
