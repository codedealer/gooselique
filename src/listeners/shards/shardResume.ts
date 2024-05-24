import { Events, Listener } from '@sapphire/framework';

export class ShardResumeListener extends Listener<typeof Events.ShardResume> {
  async run(id: number) {
    this.container.onlineWatch.start();
    this.container.logger.info(`Shard ${id} resumed`);
  }
}
