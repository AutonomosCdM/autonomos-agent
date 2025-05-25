import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { Message } from '../../types/database';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async generateResponse(
    messages: Message[],
    systemPrompt?: string,
    model = 'claude-3-sonnet-20240229',
    maxTokens = 1000
  ): Promise<string> {
    try {
      // Convert database messages to Anthropic format
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Ensure conversation starts with user message
      if (anthropicMessages.length === 0 || anthropicMessages[0].role !== 'user') {
        throw new Error('Conversation must start with a user message');
      }

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        system: systemPrompt,
      });

      // Extract text from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return textContent;
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async streamResponse(
    messages: Message[],
    systemPrompt?: string,
    model = 'claude-3-sonnet-20240229',
    maxTokens = 1000,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      if (anthropicMessages.length === 0 || anthropicMessages[0].role !== 'user') {
        throw new Error('Conversation must start with a user message');
      }

      const stream = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        system: systemPrompt,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          onChunk?.(text);
        }
      }

      return fullResponse;
    } catch (error) {
      logger.error('Claude streaming error:', error);
      throw new Error('Failed to stream AI response');
    }
  }
}