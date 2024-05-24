import pino from 'pino';
import pretty from 'pino-pretty';
import { ILogger, LogLevel } from '@sapphire/framework';

const LOG_LEVEL_MAP: Record<LogLevel, pino.Level> = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Error]: 'error',
  [LogLevel.Fatal]: 'fatal',
  [LogLevel.Trace]: 'trace',
  [LogLevel.None]: 'fatal',
} as const;

class Logger implements ILogger {
  private readonly level: LogLevel;
  private readonly instance: pino.Logger;

  constructor(level: LogLevel, target: pino.DestinationStream | pretty.PrettyStream) {
    this.level = level;

    const pinoLevel = LOG_LEVEL_MAP[level];
    this.instance = pino(
      {
        level: pinoLevel,
      },
      target,
    );
  }

  has(level: LogLevel): boolean {
    return level <= this.level;
  }

  trace(...values: readonly unknown[]): void {
    this.write(LogLevel.Trace, ...values);
  }

  debug(...values: readonly unknown[]): void {
    this.write(LogLevel.Debug, ...values);
  }

  info(...values: readonly unknown[]): void {
    this.write(LogLevel.Info, ...values);
  }

  warn(...values: readonly unknown[]): void {
    this.write(LogLevel.Warn, ...values);
  }

  error(...values: readonly unknown[]): void {
    this.write(LogLevel.Error, ...values);
  }

  fatal(...values: readonly unknown[]): void {
    this.write(LogLevel.Fatal, ...values);
  }

  write(level: LogLevel, ...values: readonly unknown[]): void {
    if (this.level === LogLevel.None || level === LogLevel.None) return;
    if (values.length === 0) {
      this.instance.debug('Empty value supplied to logger');
      return;
    }

    this.instance[LOG_LEVEL_MAP[level]](values[0], ...(values.slice(1) as any));
  }
}

export default Logger;
