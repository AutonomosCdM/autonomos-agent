import { MessageProcessor } from '../../src/services/message-processor';
import { ConversationService, AgentService } from '../../src/services/database';
import { OpenRouterService } from '../../src/services/ai/openrouter';

// Mock dependencies
jest.mock('../../src/services/database');
jest.mock('../../src/services/ai/openrouter');
jest.mock('../../src/utils/logger');

describe('MessageProcessor', () => {
  let messageProcessor: MessageProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    messageProcessor = new MessageProcessor();
  });

  describe('processMessage', () => {
    const mockProcessRequest = {
      organizationId: 'org-123',
      channelId: 'channel-123',
      conversationId: 'conv-123',
      messageContent: 'Hello, I need help with my order',
      metadata: {
        user_name: 'Test User',
      },
    };

    const mockMessages = [
      {
        role: 'user',
        content: 'Hi',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        role: 'assistant',
        content: 'Hello! How can I help you?',
        created_at: '2024-01-01T10:01:00Z',
      },
    ];

    const mockAgent = {
      id: 'agent-123',
      name: 'Customer Support Agent',
      system_prompt: 'You are a helpful customer support agent.',
      model: 'anthropic/claude-3-opus',
      configuration: {
        temperature: 0.7,
        max_tokens: 1000,
      },
    };

    it('should process message with conversation history', async () => {
      // Setup mocks
      (ConversationService.getMessages as jest.Mock).mockResolvedValue(mockMessages);
      (AgentService.getPrimaryForChannel as jest.Mock).mockResolvedValue(mockAgent);
      (OpenRouterService.prototype.generateResponse as jest.Mock).mockResolvedValue(
        'I can help you with your order. Could you provide your order number?'
      );

      const response = await messageProcessor.processMessage(mockProcessRequest);

      expect(response).toBe('I can help you with your order. Could you provide your order number?');

      // Verify conversation history was fetched
      expect(ConversationService.getMessages).toHaveBeenCalledWith(
        'org-123',
        'conv-123',
        20
      );

      // Verify OpenRouter was called with correct params
      expect(OpenRouterService.prototype.generateResponse).toHaveBeenCalledWith({
        model: 'anthropic/claude-3-opus',
        messages: [
          { role: 'system', content: 'You are a helpful customer support agent.' },
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello! How can I help you?' },
          { role: 'user', content: 'Hello, I need help with my order' },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
    });

    it('should use default agent when no agent is assigned', async () => {
      (ConversationService.getMessages as jest.Mock).mockResolvedValue([]);
      (AgentService.getPrimaryForChannel as jest.Mock).mockResolvedValue(null);
      (OpenRouterService.prototype.generateResponse as jest.Mock).mockResolvedValue(
        'Hello! I\'m here to help.'
      );

      const response = await messageProcessor.processMessage(mockProcessRequest);

      expect(response).toBe('Hello! I\'m here to help.');

      // Verify default system prompt was used
      expect(OpenRouterService.prototype.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('helpful AI assistant'),
            }),
          ]),
        })
      );
    });

    it('should handle empty conversation history', async () => {
      (ConversationService.getMessages as jest.Mock).mockResolvedValue([]);
      (AgentService.getPrimaryForChannel as jest.Mock).mockResolvedValue(mockAgent);
      (OpenRouterService.prototype.generateResponse as jest.Mock).mockResolvedValue(
        'Hello! How can I assist you today?'
      );

      const response = await messageProcessor.processMessage(mockProcessRequest);

      expect(response).toBe('Hello! How can I assist you today?');

      // Verify only system prompt and current message were sent
      expect(OpenRouterService.prototype.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: mockAgent.system_prompt },
            { role: 'user', content: mockProcessRequest.messageContent },
          ],
        })
      );
    });

    it('should throw error when AI service fails', async () => {
      (ConversationService.getMessages as jest.Mock).mockResolvedValue([]);
      (AgentService.getPrimaryForChannel as jest.Mock).mockResolvedValue(mockAgent);
      (OpenRouterService.prototype.generateResponse as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      await expect(messageProcessor.processMessage(mockProcessRequest)).rejects.toThrow('API Error');
    });

    it('should include metadata in system context when available', async () => {
      const requestWithMetadata = {
        ...mockProcessRequest,
        metadata: {
          user_name: 'John Doe',
          slack_channel: 'support',
          platform: 'slack',
        },
      };

      (ConversationService.getMessages as jest.Mock).mockResolvedValue([]);
      (AgentService.getPrimaryForChannel as jest.Mock).mockResolvedValue(mockAgent);
      (OpenRouterService.prototype.generateResponse as jest.Mock).mockResolvedValue('Hi John!');

      await messageProcessor.processMessage(requestWithMetadata);

      // Verify metadata was included in system message
      expect(OpenRouterService.prototype.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('John Doe'),
            }),
          ]),
        })
      );
    });
  });
});