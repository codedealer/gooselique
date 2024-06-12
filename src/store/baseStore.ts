import { DataBaseDriver, Flushable, FlushableDataBaseDriver } from '../types';
import { TimerManager } from '@sapphire/time-utilities';

abstract class BaseStore<T extends Flushable> implements FlushableDataBaseDriver<T> {
  protected readonly flushTimer?: NodeJS.Timeout;
  public data: T;

  protected constructor(
    protected db: DataBaseDriver<T>,
    protected TTL?: number,
    timeout?: number,
  ) {
    this.data = db.data;

    if (!TTL || !timeout || TTL < 1 || timeout < 0) {
      return;
    }

    this.flushTimer = TimerManager.setInterval(async () => {
      const now = Date.now();
      await this.flush(now);
    }, timeout);
  }

  read(): Promise<void> {
    return this.db.read();
  }
  write(): Promise<void> {
    this.data.dirty = true;

    return this.db.write();
  }
  update(fn: (data: T) => unknown): Promise<void> {
    this.data.dirty = true;

    return this.db.update(fn);
  }
  destroy(): void {
    if (this.flushTimer) {
      TimerManager.clearInterval(this.flushTimer);
    }
  }
  abstract flush(now: number): Promise<void>;
}

export default BaseStore;
