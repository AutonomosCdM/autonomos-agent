import request from 'supertest';
import express from 'express';
import { whatsappRouter } from '../../src/api/webhooks/whatsapp';
import { slackRouter } from '../../src/api/webhooks/slack';
import { supabaseAdmin } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
  },
}));

// Mock external services
jest.mock('twilio');
jest.mock('@slack/web-api');
jest.mock('../../src/services/ai/openrouter');
jest.mock('../../src/utils/logger');

describe('Webhook Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/webhook/whatsapp', whatsappRouter);
    app.use('/webhook/slack', slackRouter);
    jest.clearAllMocks();
  });

  describe('End-to-End WhatsApp Flow', () => {
    it('should handle complete WhatsApp message flow', async () => {
      // Setup mock data
      const orgSlug = 'test-company';
      const mockOrg = {
        id: 'org-123',
        name: 'Test Company',
        slug: orgSlug,
      };

      const mockChannel = {
        id: 'channel-123',
        organization_id: 'org-123',
        type: 'whatsapp',
        configuration: {
          phone_number: '+1234567890',
          twilio_account_sid: 'AC123',
          twilio_auth_token: 'auth123',
        },
      };

      const mockAgent = {
        id: 'agent-123',
        system_prompt: 'You are a helpful assistant.',
        model: 'anthropic/claude-3-opus',
      };

      // Mock database responses
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn();

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'organizations') {
          mockSingle.mockResolvedValueOnce({ data: mockOrg, error: null });
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
          };
        }
        if (table === 'channels') {
          // First call - check by type and config
          mockSingle.mockResolvedValueOnce({ data: null, error: null });
          // Return array of channels for filtering
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => Promise.resolve({ 
              data: [mockChannel], 
              error: null 
            })),
          };
        }
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { id: 'conv-123' }, 
              error: { code: 'PGRST116' } // Not found, will create
            }),
            insert: mockInsert,
          };
        }
        if (table === 'messages') {
          mockLimit.mockResolvedValue({ data: [], error: null });
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: mockOrder,
            limit: mockLimit,
            insert: mockInsert,
          };
        }
        if (table === 'channel_agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { agent_id: 'agent-123' }, error: null }),
          };
        }
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      // Mock RPC for conversation creation
      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
        data: 'conv-123',
        error: null,
      });

      // Mock OpenRouter response
      const OpenRouterService = require('../../src/services/ai/openrouter').OpenRouterService;
      OpenRouterService.prototype.generateResponse = jest.fn().mockResolvedValue(
        'Thank you for your message! How can I help you today?'
      );

      // Mock Twilio
      const twilio = require('twilio');
      const mockTwilioClient = {
        messages: {
          create: jest.fn().mockResolvedValue({ sid: 'SM123' }),
        },
      };
      twilio.mockReturnValue(mockTwilioClient);

      // Send WhatsApp message
      const response = await request(app)
        .post(`/webhook/whatsapp/${orgSlug}`)
        .send({
          From: 'whatsapp:+9876543210',
          To: '+1234567890',
          Body: 'Hello, I need help!',
          MessageSid: 'SM456',
          ProfileName: 'John Doe',
        })
        .expect(200);

      expect(response.text).toBe('<Response></Response>');

      // Verify message was sent back via Twilio
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Thank you for your message! How can I help you today?',
        from: 'whatsapp:+1234567890',
        to: 'whatsapp:+9876543210',
      });
    });
  });

  describe('End-to-End Slack Flow', () => {
    it('should handle complete Slack message flow', async () => {
      const mockOrg = {
        id: 'org-456',
        name: 'Slack Test Org',
        slack_workspace_id: 'T123456',
      };

      const mockChannel = {
        id: 'channel-456',
        organization_id: 'org-456',
        type: 'slack',
        configuration: {
          slack_bot_token: 'xoxb-test-token',
          channel_id: 'C123456',
        },
      };

      // Mock database responses for Slack
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
          };
        }
        if (table === 'channels') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockChannel, error: null }),
          };
        }
        // ... other table mocks similar to WhatsApp
        return supabaseAdmin;
      });

      // Mock Slack Web API
      const { WebClient } = require('@slack/web-api');
      const mockPostMessage = jest.fn().mockResolvedValue({ ok: true });
      WebClient.prototype.chat = { postMessage: mockPostMessage };

      // Mock OpenRouter
      const OpenRouterService = require('../../src/services/ai/openrouter').OpenRouterService;
      OpenRouterService.prototype.generateResponse = jest.fn().mockResolvedValue(
        'I\'d be happy to help you with that!'
      );

      // Send Slack event
      const slackEvent = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'message',
          channel: 'C123456',
          user: 'U789012',
          text: 'Can you help me understand this?',
          ts: '1234567890.123456',
        },
      };

      await request(app)
        .post('/webhook/slack/events')
        .send(slackEvent)
        .expect(200);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify Slack message was sent
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: 'C123456',
        text: 'I\'d be happy to help you with that!',
        thread_ts: '1234567890.123456',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }));

      await request(app)
        .post('/webhook/whatsapp/test-org')
        .send({
          From: 'whatsapp:+1234567890',
          To: '+0987654321',
          Body: 'Test message',
        })
        .expect(500);
    });

    it('should handle AI service errors', async () => {
      // Setup basic mocks
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      // Mock AI service error
      const OpenRouterService = require('../../src/services/ai/openrouter').OpenRouterService;
      OpenRouterService.prototype.generateResponse = jest.fn().mockRejectedValue(
        new Error('AI service unavailable')
      );

      // Should still return 200 to acknowledge webhook
      await request(app)
        .post('/webhook/whatsapp/test-org')
        .send({
          From: 'whatsapp:+1234567890',
          To: '+0987654321',
          Body: 'Test message',
        })
        .expect(200);
    });
  });
});