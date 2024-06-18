import { MessageHook } from '../types';
import { Message } from 'discord.js';

class ImgurHook implements MessageHook {
  private readonly imgurVideoRegex = /https:\/\/(i\.)?imgur\.com\S+\.mp4\/?/gi;
  public readonly name = 'Imgur link fixer';

  public async run(message: Message): Promise<void> {
    const originalUrls = this.findImgurVideoUrls(message.content);

    const fixedUrls = originalUrls.map(ImgurHook.replacer);

    if (fixedUrls.length === 0) return;

    let content = message.content;
    for (let i = 0; i < originalUrls.length; i++) {
      content = content.replace(originalUrls[i].toString(), fixedUrls[i]);
    }

    await message.delete();
    await message.channel.send(
      `Imgur links were fixed. Original message by ${message.author.displayName}:\n${content}`,
    );
  }

  private findImgurVideoUrls(content: string): URL[] {
    const urls = content.match(this.imgurVideoRegex);
    if (!urls) return [];
    return urls.map((url) => new URL(url));
  }

  private static replacer(url: URL): string {
    // immutable
    const fixedUrl = new URL(url.toString());
    fixedUrl.hostname = 'i.imgur.io';
    fixedUrl.search = '';

    return fixedUrl.toString();
  }
}

export default ImgurHook;
