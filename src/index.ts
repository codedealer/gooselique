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
import clientFactory from './chat/client';
import promptStoreFactory from './chat/promptStore';
import path from 'node:path';
import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createFlushableStore } from './store/createFlushableStore';
import { ActionRegistryItem, CacheMessage, CacheStoreData } from './types';
import GuildCacheStore from './store/GuildCacheStore';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(rootDir, '.env') });

const main = async () => {
  container.onlineWatch = new Stopwatch(0);
  container.processWatch = new Stopwatch(0);

  container.appConfig = await config();

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

  try {
    container.appStore = {
      messagesStore: await createFlushableStore<CacheStoreData<CacheMessage>>(
        GuildCacheStore,
        container.appConfig.data.persistence.messages,
        {
          cache: {},
          lastFlush: Date.now(),
          dirty: false,
        },
      ),
      actionRegistryStore: await createFlushableStore<CacheStoreData<ActionRegistryItem>>(
        GuildCacheStore,
        container.appConfig.data.persistence.actionRegistry,
        {
          cache: {},
          lastFlush: Date.now(),
          dirty: false,
        },
      ),
    };
  } catch (e) {
    logger.fatal(e, 'Failed to initialize app store');
    return;
  }

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

  const actionsDir = path.join(__dirname, 'actions');
  const actionFiles = fs.readdirSync(actionsDir);

  // Load all action classes and add them to the container
  container.actions = {};
  for (const file of actionFiles) {
    try {
      // Import the class file
      if (!file.endsWith('.js')) continue;
      const fileURL = pathToFileURL(path.join(actionsDir, file));
      const ActionClassModule = await import(fileURL.href);
      const ActionClass = ActionClassModule.default.default;

      const instance = new ActionClass();
      if (!(instance instanceof ActionClass)) {
        throw new Error(`Action class ${file} is not an instance of Action`);
      }
      if (!instance.name) {
        throw new Error(`Action class ${file} is missing a name property`);
      }

      logger.debug(`Loaded action class ${instance.name}`);

      container.actions[instance.name] = ActionClass;
    } catch (error) {
      logger.error(error, `Failed to load action class ${file}`);
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

  process.on('unhandledRejection', (error) => {
    logger.fatal('Unhandled promise rejection:', error);

    process.exit(1);
  });

  try {
    client.logger.info('Logging in');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    client.logger.fatal(error);
    // reset store timers
    for (const store of Object.values(container.appStore)) {
      store.destroy();
    }
    await client.destroy();
    process.exit(1);
  }
};

void main();
