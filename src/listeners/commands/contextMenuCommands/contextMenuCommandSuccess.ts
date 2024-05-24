import { Listener, LogLevel, type ContextMenuCommandSuccessPayload } from '@sapphire/framework';
import { logSuccessCommand } from '../../../lib/utils';

export class UserListener extends Listener {
  public override run(payload: ContextMenuCommandSuccessPayload) {
    logSuccessCommand(payload);
  }

  public override onLoad() {
    this.enabled = this.container.logger.has(LogLevel.Debug);
    return super.onLoad();
  }
}
