import request from 'supertest';
import express from 'express';
import twilio from 'twilio';
import { whatsappRouter } from '../../../src/api/webhooks/whatsapp';
import { OrganizationService, ChannelService, ConversationService } from '../../../src/services/database';
import { MessageProcessor } from '../../../src/services/message-processor';

// Mock dependencies
jest.mock('twilio');
jest.mock('../../../src/services/database');
jest.mock('../../../src/services/message-processor');
jest.mock('../../../src/utils/logger');

// Mock Twilio client
const mockTwilioClient = {
  messages: {
    create: jest.fn(),
  },
};

(twilio as unknown as jest.Mock).mockReturnValue(mockTwilioClient);

describe('WhatsApp Webhook', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use('/webhook/whatsapp', whatsappRouter);
    jest.clearAllMocks();
  });

  describe('POST /:orgSlug', () => {
    const validOrgSlug = 'test-org';
    const validRequestBody = {
      From: 'whatsapp:+1234567890',
      To: '+0987654321',
      Body: 'Hello, I need help',
      MessageSid: 'SM1234567890',
      ProfileName: 'Test User',
    };

    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: validOrgSlug,
    };

    const mockChannel = {
      id: 'channel-123',
      organization_id: 'org-123',
      type: 'whatsapp',
      configuration: {
        phone_number: '+0987654321',
        twilio_account_sid: 'AC123',
        twilio_auth_token: 'token123',
      },
    };

    it('should process valid WhatsApp message successfully', async () => {
      // Setup mocks
      (OrganizationService.getBySlug as jest.Mock).mockResolvedValue(mockOrganization);
      (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(mockChannel);
      (ConversationService.getOrCreate as jest.Mock).mockResolvedValue('conv-123');
      (ConversationService.addMessage as jest.Mock).mockResolvedValue(undefined);
      (MessageProcessor.prototype.processMessage as jest.Mock).mockResolvedValue('Hi! How can I help you today?');
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM987654321' });

      const response = await request(app)
        .post(`/webhook/whatsapp/${validOrgSlug}`)
        .send(validRequestBody)
        .expect(200);

      expect(response.text).toBe('<Response></Response>');
      
      // Verify service calls
      expect(OrganizationService.getBySlug).toHaveBeenCalledWith(validOrgSlug);
      expect(ChannelService.getByTypeAndConfig).toHaveBeenCalledWith(
        'org-123',
        'whatsapp',
        'phone_number',
        '+0987654321'
      );
      expect(ConversationService.getOrCreate).toHaveBeenCalledWith(
        'org-123',
        'channel-123',
        'whatsapp:+1234567890',
        expect.objectContaining({
          user_phone: 'whatsapp:+1234567890',
          user_name: 'Test User',
        })
      );
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Hi! How can I help you today?',
        from: 'whatsapp:+0987654321',
        to: 'whatsapp:+1234567890',
      });
    });

    it('should return 404 when organization not found', async () => {
      (OrganizationService.getBySlug as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post(`/webhook/whatsapp/invalid-org`)
        .send(validRequestBody)
        .expect(404);

      expect(ChannelService.getByTypeAndConfig).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app)
        .post(`/webhook/whatsapp/${validOrgSlug}`)
        .send({ From: 'whatsapp:+1234567890' }) // Missing Body
        .expect(400);
    });

    it('should return 404 when channel not found', async () => {
      (OrganizationService.getBySlug as jest.Mock).mockResolvedValue(mockOrganization);
      (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post(`/webhook/whatsapp/${validOrgSlug}`)
        .send(validRequestBody)
        .expect(404);
    });

    it('should send error message to user when AI processing fails', async () => {
      (OrganizationService.getBySlug as jest.Mock).mockResolvedValue(mockOrganization);
      (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(mockChannel);
      (ConversationService.getOrCreate as jest.Mock).mockResolvedValue('conv-123');
      (MessageProcessor.prototype.processMessage as jest.Mock).mockRejectedValue(new Error('AI Error'));
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM987654321' });

      await request(app)
        .post(`/webhook/whatsapp/${validOrgSlug}`)
        .send(validRequestBody)
        .expect(200);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
        from: 'whatsapp:+0987654321',
        to: 'whatsapp:+1234567890',
      });
    });

    it('should validate Twilio signature in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (OrganizationService.getBySlug as jest.Mock).mockResolvedValue(mockOrganization);
      (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(mockChannel);
      (twilio.validateRequest as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .post(`/webhook/whatsapp/${validOrgSlug}`)
        .set('x-twilio-signature', 'invalid-signature')
        .send(validRequestBody)
        .expect(401);

      expect(response.text).toBe('Unauthorized');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});