import { OpenRouterService } from './ai/openrouter';
import { ConversationService, AgentService } from './database';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { ChannelAgentDetails } from '../types/database';

export interface ProcessMessageOptions {
  organizationId: string;
  channelId: string;
  conversationId: string;
  messageContent: string;
  metadata?: Record<string, unknown>;
}

export class MessageProcessor {
  private openRouterService: OpenRouterService;

  constructor() {
    this.openRouterService = new OpenRouterService(config.openrouter.apiKey);
  }

  async processMessage(options: ProcessMessageOptions): Promise<string> {
    const { organizationId, channelId, conversationId, messageContent, metadata } = options;

    try {
      // Get agent configuration
      const agent = await AgentService.getForChannel(channelId);
      if (!agent) {
        throw new Error('No agent configured for this channel');
      }

      // Get conversation history
      const history = await ConversationService.getHistory(conversationId, 20);
      
      // Reverse to get chronological order
      const messages = history.reverse();

      // Generate AI response
      const aiResponse = await this.openRouterService.generateResponse(
        messages,
        agent.system_prompt || undefined,
        {
          model: agent.model,
          maxTokens: agent.configuration?.max_tokens as number || 1000,
          temperature: agent.configuration?.temperature as number || 0.7
        }
      );

      // Store AI response
      await ConversationService.addMessage(
        organizationId,
        conversationId,
        'assistant',
        aiResponse,
        {
          model: agent.model,
          agent_id: agent.agent_id,
          ...metadata,
        }
      );

      logger.info('Message processed successfully', {
        organizationId,
        conversationId,
        messageLength: messageContent.length,
        responseLength: aiResponse.length,
      });

      return aiResponse;
    } catch (error) {
      logger.error('Error processing message:', error);
      
      // Store error as system message
      await ConversationService.addMessage(
        organizationId,
        conversationId,
        'system',
        'Sorry, I encountered an error processing your message. Please try again.',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      throw error;
    }
  }

  async processStreamingMessage(
    options: ProcessMessageOptions,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const { organizationId, channelId, conversationId, messageContent, metadata } = options;

    try {
      const agent = await AgentService.getForChannel(channelId);
      if (!agent) {
        throw new Error('No agent configured for this channel');
      }

      const history = await ConversationService.getHistory(conversationId, 20);
      const messages = history.reverse();

      const aiResponse = await this.openRouterService.streamResponse(
        messages,
        agent.system_prompt || undefined,
        {
          model: agent.model,
          maxTokens: agent.configuration?.max_tokens as number || 1000,
          temperature: agent.configuration?.temperature as number || 0.7
        },
        onChunk
      );

      await ConversationService.addMessage(
        organizationId,
        conversationId,
        'assistant',
        aiResponse,
        {
          model: agent.model,
          agent_id: agent.agent_id,
          ...metadata,
        }
      );

      return aiResponse;
    } catch (error) {
      logger.error('Error in streaming message:', error);
      throw error;
    }
  }
}