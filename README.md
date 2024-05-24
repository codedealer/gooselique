# Helpful bot built to crack down on automated behavior

A Discord bot using the [sapphire framework][sapphire] written in TypeScript

## How to use it?

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
