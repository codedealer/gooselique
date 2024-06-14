import { container } from '@sapphire/framework';

export const recordTotalBanScore = async (guildId: string) => {
  await container.appStore.bucketStore.update(async (data) => {
    if (!data.bans) data.bans = {};
    let guildBucket = data.bans[guildId] ?? 0;

    data.bans[guildId] = guildBucket + 1;
  });
};
