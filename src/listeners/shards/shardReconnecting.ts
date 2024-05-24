import { Events, Listener } from '@sapphire/framework';

export class ShardReconnectingListener extends Listener<typeof Events.ShardReconnecting> {
  async run(id: number) {
    this.container.onlineWatch.stop();
    this.container.logger.warn(`Shard ${id} is attempting to reconnect`);
  }
}
