import { Events, Listener } from '@sapphire/framework';
import { CloseEvent } from 'discord.js';

export class ShardDisconnectListener extends Listener<typeof Events.ShardDisconnect> {
  async run(event: CloseEvent, id: number) {
    this.container.onlineWatch.stop();
    this.container.logger.error(`Shard ${id} disconnected with code ${event.code}`);
  }
}
