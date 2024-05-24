import { Events, Listener } from '@sapphire/framework';

export class ShardReadyListener extends Listener<typeof Events.ShardReady> {
  async run(id: number) {
    this.container.onlineWatch.start();
    this.container.logger.info(`Shard ${id} is ready`);
  }
}
