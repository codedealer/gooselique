import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';

//@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
  public override run() {
    this.container.logger.info(`Logged in as ${this.container.client.user!.username}`);
    this.printStoreDebugInformation();
  }

  private printStoreDebugInformation() {
    const { client, logger } = this.container;
    const stores = [...client.stores.values()];

    for (const store of stores) logger.info(this.styleStore(store));
  }

  private styleStore(store: StoreRegistryValue) {
    return `Loaded ${store.size.toString().padEnd(3, ' ')} ${store.name}.`;
  }
}
