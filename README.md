# Helpful bot built to crack down on automated behavior

A Discord bot using the [sapphire framework](https://github.com/sapphiredev/framework) written in TypeScript.

While it has a "character", supporting /pet and /vanquish its main functionality is pretty universal focusing on auto moderation controlled by a simple config.

# Configuration

The configuration for the bot is defined in `config.json` located in the root (don't know why there). It also can generate ancillary files during runtime, the default place for them is in the `data/` but can be changed in the config.

Required properties of the config will be created for you on the first run, but you can also create them manually.

Here's a breakdown of config:

## logs

- `level`: The log level for the bot. It can be any of the `LogLevel` values from the `@sapphire/framework`. Default is `Info`.
- `path`: The path where the logs should be stored. If set to `false`, logs will not be stored and the console output will be used. **Note**: In DEBUG mode logs are always output in the console.

## persistence

This section defines the persistence settings for the bot.

### messages

- `driver`: The driver to use for storing messages. It can be either 'json' or 'memory'.
- `path`: The path where the messages should be stored. If using `memory` set it to an empty string.
- `flushInterval`: How often to remove old messages (in milliseconds).
- `TTL`: How long to keep messages for (in milliseconds).

If TTL is set to 0, messages will never be removed making it a json database. Be careful with storing messages for a long period of time in a large server. It is all stored in RAM during runtime.

### actionRegistry

Stores actions taken by the moderation strategies. By default, the bot can mute or ban users. The config options are the same as the `messages` section.

### bucket

Bot has some data that needs to be stored permanently. This is the configuration for that.

- `path`: The path where the persistent storage for the bot should be stored.

## chat

This controls the LLM functionality.

- `endpoint`: The endpoint for the chat completions endpoint. Usually looks like so `https://example.com/v1`.
- `model`: The model to use for the chat service.
- `allowChatIn`: Can be an object where the key is the guild id and the value is an array of channel ids or 'all' for all channels in the guild. Can also be 'all' for all guilds and channels.
- `usernameInPrompt`: Whether to include the username in the prompt before the user's message. Useful in multi-user chat modes.
- `promptFile`: the path to the prompt file. This is a file that contains the prompt for the chat service. Refer to `Prompt` interface in `src/types.ts` for the structure of the prompt file.
- `params`: an arbitrary array of parameters to pass to your LLM endpoint.

## botAdmins

An array of user ids that will get full permissions to the bot.

## alertChannel

Some errors bot can relay to the dedicated channel, so you don't have to monitor the logs constantly.

- `guildId`: The guild id for the alert channel.
- `channelId`: The channel id for the alert channel.

## commands

An object where the key is a command name and the value is an options object. You can control rate limiting and restrict commands to certain guilds from here.

## moderation

An array of moderation rules. The rules are evaluated from top to bottom, so put the rules with the most broad conditions at the top. Each rule is an object with the following properties:

- `id`: The id of the rule. Used for logging.
- `enabled`: Whether the rule is enabled.
- `rateLimit`: An object defining the rate limit for the rule. It controls the minimum number of messages in the number of channels over the designated period of time needed to trigger the rule.
- `policy`: The policy for the rule. It can be either 'content_filter' or 'flood_protection'.
- `contentFilter`: if 'content_filter' is the policy, this is the regex to check the messages against.
- `action`: The action to take when the rule is violated. The bot is shipped with `ban` and `mute` actions. More can be added to `src/actions` folder, be sure to inherit from `BaseAction`.

## actions

An object for specific options for actions. The key is the action name and the value is an object with the following properties:

- `reporting`: instead of sending a message to the channel that triggered the action the bot can send it to a dedicated channel, specified as `{ guildId: channelId }`. If no reporting channel exist for the guild the message will be sent to the channel that triggered the action.

## hooks

An object where the key is a hook name and the value is an options object.
Hooks are run on each message after moderation is passed. A hook can be enabled/disabled and can be restricted to certain guilds.

## LLM

It also has a simple LLM functionality (currently via /ask but maybe with natural conversations in the future). It uses openai client to generate responses so any openai compatible chat completions endpoint should do.

### Prerequisite

```sh
pnpm install
```

### Development

This bot can be run with `tsc-watch` to watch the files and automatically restart your bot.

```sh
pnpm run watch:start
```

### Production

You can also run the bot with `npm dev`, this will first build your code and then run `node ./dist/index.js`. But this is not the recommended way to run a bot in production.
