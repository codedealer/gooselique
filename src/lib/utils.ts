import {
  type ChatInputCommandSuccessPayload,
  type Command,
  container,
  type ContextMenuCommandSuccessPayload,
  type MessageCommandSuccessPayload,
} from '@sapphire/framework';
import type { APIUser, Guild, User } from 'discord.js';

export function logSuccessCommand(
  payload:
    | ContextMenuCommandSuccessPayload
    | ChatInputCommandSuccessPayload
    | MessageCommandSuccessPayload,
): void {
  let successLoggerData: ReturnType<typeof getSuccessLoggerData>;

  if ('interaction' in payload) {
    successLoggerData = getSuccessLoggerData(
      payload.interaction.guild,
      payload.interaction.user,
      payload.command,
    );
  } else {
    successLoggerData = getSuccessLoggerData(
      payload.message.guild,
      payload.message.author,
      payload.command,
    );
  }

  container.logger.debug(
    `${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`,
  );
}

export function getSuccessLoggerData(guild: Guild | null, user: User, command: Command) {
  const shard = getShardInfo(guild?.shardId ?? 0);
  const commandName = getCommandInfo(command);
  const author = getAuthorInfo(user);
  const sentAt = getGuildInfo(guild);

  return { shard, commandName, author, sentAt };
}

function getShardInfo(id: number) {
  return `[${id.toString()}]`;
}

function getCommandInfo(command: Command) {
  return command.name;
}

function getAuthorInfo(author: User | APIUser) {
  return `${author.username}[${author.id}]`;
}

function getGuildInfo(guild: Guild | null) {
  if (guild === null) return 'Direct Messages';
  return `${guild.name}[${guild.id}]`;
}

const END_SYMBOLS = new Set(`."”;’'*!！?？)}]\`>~`.split(''));
const END_SEQUENCES = ['\n```', '\n---', '\n***', '\n___', '\n===', '\n"""', '\n*/'];
const MID_SYMBOLS = new Set(`.)}’'!?\``.split(''));

export function trimSentence(text: string) {
  let index = -1,
    checkpoint = -1;
  sentence_loop: for (let i = text.length - 1; i >= 0; i--) {
    // first check for end sequences
    for (const seq of END_SEQUENCES) {
      if (text.slice(i, i + seq.length) === seq) {
        // only trim if it's not an opening sequence
        if (i + seq.length < text.length && /\p{L}/u.test(text[i + seq.length])) {
          break;
        }
        index = i + seq.length - 1;
        break sentence_loop;
      }
    }
    if (END_SYMBOLS.has(text[i])) {
      // Skip ahead if the punctuation mark is preceded by white space
      if (i && /[\p{White_Space}\n<]/u.test(text[i - 1])) {
        index = i - 1;
        continue;
      }
      // Save if there are several punctuation marks in a row
      if (i && END_SYMBOLS.has(text[i - 1])) {
        if (checkpoint < i) checkpoint = i;
        continue;
      }
      // Skip if the punctuation mark is in the middle of a word
      if (
        MID_SYMBOLS.has(text[i]) &&
        i > 0 &&
        i < text.length - 1 &&
        /\p{L}/u.test(text[i - 1]) &&
        /\p{L}/u.test(text[i + 1])
      ) {
        continue;
      }
      index = checkpoint > i ? checkpoint : i;
      break;
    } else {
      checkpoint = -1;
    }
  }
  return index === -1 ? text.trimEnd() : text.slice(0, index + 1).trimEnd();
}
