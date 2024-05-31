import { join } from 'path';

export const rootDir = join(__dirname, '..', '..');
export const srcDir = join(rootDir, 'src');
export const configPath = join(rootDir, 'config.json');
export const userMentionRegex = /<@!?(?<id>\d{17,20})>/g;
