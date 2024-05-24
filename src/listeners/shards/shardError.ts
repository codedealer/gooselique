import { Events, Listener } from '@sapphire/framework';

export class ShardErrorListener extends Listener<typeof Events.ShardError> {
  async run(error: Error, id: number) {
    this.container.logger.error(`Shard ${id} encountered an error: ${error.message}`);
  }
}
