import {
  ApplicationCommandRegistries,
  BucketScope,
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
import clientFactory from './chat/client';
import promptStoreFactory from './chat/promptStore';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(rootDir, '.env') });

const main = async () => {
  container.onlineWatch = new Stopwatch(0);
  container.processWatch = new Stopwatch(0);

  container.appConfig = await config();

  container.appStore = {
    messagesStore: await messagesStoreFactory(container.appConfig.data),
  };

  const prod = process.env.MODE === 'production';
  const logPath =
    typeof container.appConfig.data.logs.path === 'string'
      ? container.appConfig.data.logs.path
      : false;
  let target;
  if (prod) {
    target = logPath ? pino.destination(logPath) : pino.destination('/dev/null');
  } else {
    target = pretty({
      colorize: true,
    });
  }

  const logger = new Logger(prod ? container.appConfig.data.logs.level : LogLevel.Debug, target);

  container.chat = {};
  if (container.appConfig.data.chat.endpoint && process.env.LLM_TOKEN) {
    container.chat.client = clientFactory(container.appConfig.data.chat, process.env.LLM_TOKEN);

    if (!container.appConfig.data.chat.promptFile) {
      logger.warn(
        'No prompt file specified for LLM, it will run without a prompt. You can specify the path to prompt file in the config.',
      );
    } else {
      container.chat.prompt = await promptStoreFactory(container.appConfig.data.chat.promptFile);
    }
  }

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
    defaultCooldown: {
      filteredUsers: container.appConfig.data.botAdmins,
      scope: BucketScope.Channel,
    },
  });

  try {
    client.logger.info('Logging in');
    await client.login(process.env.DISCORD_TOKEN);
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
