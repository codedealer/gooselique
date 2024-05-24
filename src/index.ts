import {
  ApplicationCommandRegistries,
  container,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { join } from 'path';
import { setup } from '@skyra/env-utilities';
import { rootDir } from './lib/constants';
import { Stopwatch } from '@sapphire/stopwatch';
import config from './store/config';
import Logger from './logger';
import pino from 'pino';
import pretty from 'pino-pretty';
import messagesStoreFactory from './store/messagesStore';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(rootDir, '.env') });

const main = async () => {
  container.onlineWatch = new Stopwatch(0);
  container.processWatch = new Stopwatch(0);

  container.appConfig = await config();

  container.appStore.messagesStore = await messagesStoreFactory(container.appConfig.data);

  const prod = process.env.MODE === 'production';
  const path =
    typeof container.appConfig.data.logs.path === 'string'
      ? container.appConfig.data.logs.path
      : false;
  let target;
  if (prod) {
    target = path ? pino.destination(path) : pino.destination('/dev/null');
  } else {
    target = pretty({
      colorize: true,
    });
  }

  const logger = new Logger(prod ? container.appConfig.data.logs.level : LogLevel.Debug, target);

  const client = new SapphireClient({
    disableMentionPrefix: true,
    defaultPrefix: null,
    loadDefaultErrorListeners: true,
    logger: {
      instance: logger,
    },
    intents: [
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent,
    ],
    loadMessageCommandListeners: false,
  });

  try {
    client.logger.info('Logging in');
    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info('logged in');
  } catch (error) {
    client.logger.fatal(error);
    await client.destroy();
    process.exit(1);
  }

  process.on('unhandledRejection', (error) => {
    logger.fatal('Unhandled promise rejection:', error);

    process.exit(1);
  });
};

void main();
