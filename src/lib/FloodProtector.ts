import { CacheMessage, ContentPolicyEnforcer } from '../types';

export class FloodProtector implements ContentPolicyEnforcer {
  private currentMsg: string | null = null;

  async execute(message: CacheMessage): Promise<boolean> {
    const msg = message.content.trim().normalize().toLowerCase();
    if (this.currentMsg === null) {
      this.currentMsg = msg;
      return true;
    }

    return this.currentMsg === msg;
  }
}
