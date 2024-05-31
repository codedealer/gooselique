import OpenAI from 'openai';
import {
  ChatMessage,
  Config,
  isAssistantChatMessage,
  isUserChatMessage,
  Prompt,
  UserChatMessage,
} from '../types';
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

export interface composePromptOptions {
  message: UserChatMessage;
  prompt?: Prompt;
  history?: ChatMessage[];
}

const getMessageParam = (
  message: ChatMessage,
  config: Config['chat'],
): ChatCompletionMessageParam => {
  if (isAssistantChatMessage(message)) return { role: 'assistant', content: message.content };
  if (!isUserChatMessage(message)) throw new Error(`Invalid message role: ${message.role}`);

  const { usernameInPrompt } = config;
  const content = usernameInPrompt
    ? `name: ${message.userName}:\ncontent:${message.content}`
    : message.content;

  return { role: 'user', content };
};

const composePrompt = (
  options: composePromptOptions,
  config: Config['chat'],
): ChatCompletionMessageParam[] => {
  const { message, prompt, history } = options;
  const messages: ChatCompletionMessageParam[] = prompt?.system
    ? [{ role: 'system', content: prompt.system }]
    : [];

  if (history) {
    for (const msg of history) {
      messages.push(getMessageParam(msg, config));
    }
  }

  messages.push(getMessageParam(message, config));

  return messages;
};

export default composePrompt;
