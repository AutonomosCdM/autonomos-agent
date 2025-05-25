import axios from 'axios';
import { logger } from '../../utils/logger';
import type { Message } from '../../types/database';

export interface OpenRouterConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class OpenRouterService {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: Message[],
    systemPrompt?: string,
    config: Partial<OpenRouterConfig> = {}
  ): Promise<string> {
    try {
      // Default configuration
      const defaultConfig: OpenRouterConfig = {
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        ...config
      };

      // Convert database messages to OpenRouter format
      const openRouterMessages = [];

      // Add system message if provided
      if (systemPrompt) {
        openRouterMessages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add conversation messages
      messages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          openRouterMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });

      // Ensure conversation starts with user message (after system)
      const userMessages = openRouterMessages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        throw new Error('Conversation must contain at least one user message');
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: defaultConfig.model,
          messages: openRouterMessages,
          max_tokens: defaultConfig.maxTokens,
          temperature: defaultConfig.temperature,
          top_p: defaultConfig.topP,
          frequency_penalty: defaultConfig.frequencyPenalty,
          presence_penalty: defaultConfig.presencePenalty,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://autonomos.com',
            'X-Title': 'Autonomos Agent'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = response.data.choices[0].message.content;
      
      // Log usage info
      if (response.data.usage) {
        logger.info('OpenRouter API usage', {
          model: defaultConfig.model,
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens
        });
      }

      return content;
    } catch (error) {
      logger.error('OpenRouter API error:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        if (status === 401) {
          throw new Error('Invalid OpenRouter API key');
        } else if (status === 429) {
          throw new Error('OpenRouter rate limit exceeded');
        } else if (status === 400) {
          throw new Error(`OpenRouter API error: ${errorData?.error?.message || 'Bad request'}`);
        }
      }
      
      throw new Error('Failed to generate AI response');
    }
  }

  async streamResponse(
    messages: Message[],
    systemPrompt?: string,
    config: Partial<OpenRouterConfig> = {},
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const defaultConfig: OpenRouterConfig = {
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 1000,
        temperature: 0.7,
        ...config
      };

      const openRouterMessages = [];

      if (systemPrompt) {
        openRouterMessages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          openRouterMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: defaultConfig.model,
          messages: openRouterMessages,
          max_tokens: defaultConfig.maxTokens,
          temperature: defaultConfig.temperature,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://autonomos.com',
            'X-Title': 'Autonomos Agent'
          },
          responseType: 'stream',
          timeout: 60000
        }
      );

      let fullResponse = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                resolve(fullResponse);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullResponse += content;
                  onChunk?.(content);
                }
              } catch (e) {
                // Ignore parsing errors for non-JSON lines
              }
            }
          }
        });

        response.data.on('error', (error: Error) => {
          logger.error('OpenRouter streaming error:', error);
          reject(error);
        });

        response.data.on('end', () => {
          resolve(fullResponse);
        });
      });
    } catch (error) {
      logger.error('OpenRouter streaming error:', error);
      throw new Error('Failed to stream AI response');
    }
  }

  // Get available models
  async getModels(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  // Validate API key
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getModels();
      return true;
    } catch (error) {
      return false;
    }
  }
}