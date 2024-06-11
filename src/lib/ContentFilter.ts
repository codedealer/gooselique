import { CacheMessage, ContentPolicyEnforcer } from '../types';

export class ContentFilter implements ContentPolicyEnforcer {
  private regex: RegExp;

  constructor(regex: string, flags: string = 'i') {
    this.regex = new RegExp(regex, flags);
  }

  async execute(message: CacheMessage): Promise<boolean> {
    return this.regex.test(message.content.trim());
  }
}
