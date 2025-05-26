import request from 'supertest';
import express from 'express';
import { whatsappRouter } from '../../../src/api/webhooks/whatsapp';

// Mock all dependencies
jest.mock('../../../src/services/database', () => ({
  OrganizationService: {
    getBySlug: jest.fn(),
  },
  ChannelService: {
    getByTypeAndConfig: jest.fn(),
  },
  ConversationService: {
    getOrCreate: jest.fn(),
    addMessage: jest.fn(),
  },
}));

jest.mock('../../../src/services/message-processor', () => {
  return {
    MessageProcessor: jest.fn(() => ({
      processMessage: jest.fn(),
    })),
  };
});

jest.mock('twilio', () => {
  const mockClient = {
    messages: {
      create: jest.fn(),
    },
  };
  return jest.fn(() => mockClient);
});

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WhatsApp Webhook - Simplified', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use('/webhook/whatsapp', whatsappRouter);
    jest.clearAllMocks();
  });

  it('should return 404 when organization not found', async () => {
    const { OrganizationService } = require('../../../src/services/database');
    OrganizationService.getBySlug.mockResolvedValue(null);

    const response = await request(app)
      .post('/webhook/whatsapp/unknown-org')
      .send({
        From: 'whatsapp:+1234567890',
        To: '+0987654321',
        Body: 'Test message',
        MessageSid: 'SM123',
      });

    expect(response.status).toBe(404);
  });

  it('should process valid message and return 200', async () => {
    // Setup mocks
    const { OrganizationService, ChannelService, ConversationService } = require('../../../src/services/database');
    const { MessageProcessor } = require('../../../src/services/message-processor');
    const twilio = require('twilio');

    OrganizationService.getBySlug.mockResolvedValue({ id: 'org-123', name: 'Test Org' });
    // Mock the actual implementation of getByTypeAndConfig
    ChannelService.getByTypeAndConfig.mockImplementation(async (_orgId: any, _type: any, _configKey: any, configValue: any) => {
      if (configValue === '+0987654321') {
        return {
          id: 'channel-123',
          configuration: {
            phone_number: '+0987654321',
            twilio_account_sid: 'AC123',
            twilio_auth_token: 'auth123',
          },
        };
      }
      return null;
    });
    ConversationService.getOrCreate.mockResolvedValue('conv-123');
    ConversationService.addMessage.mockResolvedValue(undefined);
    const mockProcessMessage = jest.fn().mockResolvedValue('AI Response');
    MessageProcessor.mockImplementation(() => ({
      processMessage: mockProcessMessage,
    }));
    twilio().messages.create.mockResolvedValue({ sid: 'SM456' });

    const response = await request(app)
      .post('/webhook/whatsapp/test-org')
      .send({
        From: 'whatsapp:+1234567890',
        To: '+0987654321',
        Body: 'Hello!',
        MessageSid: 'SM123',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('<Response></Response>');
    expect(twilio().messages.create).toHaveBeenCalledWith({
      body: 'AI Response',
      from: 'whatsapp:+0987654321',
      to: 'whatsapp:+1234567890',
    });
  });
});