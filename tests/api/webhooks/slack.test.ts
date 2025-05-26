import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { slackRouter } from '../../../src/api/webhooks/slack';
import { OrganizationService, ChannelService, ConversationService } from '../../../src/services/database';
import { MessageProcessor } from '../../../src/services/message-processor';
import { SlackWebAPIClient } from '../../../src/services/slack/web-api-client';
import { config } from '../../../src/config';

// Mock dependencies
jest.mock('../../../src/services/database');
jest.mock('../../../src/services/message-processor');
jest.mock('../../../src/services/slack/web-api-client');
jest.mock('../../../src/utils/logger');

describe('Slack Webhook', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/webhook/slack', slackRouter);
    jest.clearAllMocks();
  });

  describe('POST /events', () => {
    describe('URL Verification', () => {
      it('should respond with challenge for URL verification', async () => {
        const challenge = 'test-challenge-string';
        
        const response = await request(app)
          .post('/webhook/slack/events')
          .send({
            type: 'url_verification',
            challenge: challenge,
          })
          .expect(200);

        expect(response.body).toEqual({ challenge });
      });
    });

    describe('Event Processing', () => {
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slack_workspace_id: 'T123456',
      };

      const mockChannel = {
        id: 'channel-123',
        organization_id: 'org-123',
        type: 'slack',
        configuration: {
          slack_bot_token: 'xoxb-test-token',
          channel_id: 'C123456',
        },
      };

      const messageEvent = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'message',
          channel: 'C123456',
          user: 'U123456',
          text: 'Hello bot!',
          ts: '1234567890.123456',
        },
      };

      const createValidSignature = (body: any, timestamp: string): string => {
        const sigBasestring = `v0:${timestamp}:${JSON.stringify(body)}`;
        const signature = 'v0=' + crypto
          .createHmac('sha256', config.slack.signingSecret)
          .update(sigBasestring, 'utf8')
          .digest('hex');
        return signature;
      };

      it('should process message event successfully', async () => {
        // Setup mocks
        (OrganizationService.getBySlackWorkspace as jest.Mock).mockResolvedValue(mockOrganization);
        (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(mockChannel);
        (ConversationService.getOrCreate as jest.Mock).mockResolvedValue('conv-123');
        (ConversationService.addMessage as jest.Mock).mockResolvedValue(undefined);
        (MessageProcessor.prototype.processMessage as jest.Mock).mockResolvedValue('Hello! How can I help?');
        
        const mockPostMessage = jest.fn().mockResolvedValue(true);
        (SlackWebAPIClient as jest.Mock).mockImplementation(() => ({
          postMessage: mockPostMessage,
        }));

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = createValidSignature(messageEvent, timestamp);

        await request(app)
          .post('/webhook/slack/events')
          .set('x-slack-signature', signature)
          .set('x-slack-request-timestamp', timestamp)
          .send(messageEvent)
          .expect(200);

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(OrganizationService.getBySlackWorkspace).toHaveBeenCalledWith('T123456');
        expect(ChannelService.getByTypeAndConfig).toHaveBeenCalledWith(
          'org-123',
          'slack',
          'channel_id',
          'C123456'
        );
        expect(mockPostMessage).toHaveBeenCalledWith({
          channel: 'C123456',
          text: 'Hello! How can I help?',
          thread_ts: '1234567890.123456',
        });
      });

      it('should ignore bot messages', async () => {
        const botMessageEvent = {
          ...messageEvent,
          event: {
            ...messageEvent.event,
            bot_id: 'B123456',
          },
        };

        await request(app)
          .post('/webhook/slack/events')
          .send(botMessageEvent)
          .expect(200);

        expect(OrganizationService.getBySlackWorkspace).not.toHaveBeenCalled();
      });

      it('should process app mention event', async () => {
        const mentionEvent = {
          ...messageEvent,
          event: {
            ...messageEvent.event,
            type: 'app_mention',
            text: '<@U123456> help me',
          },
        };

        (OrganizationService.getBySlackWorkspace as jest.Mock).mockResolvedValue(mockOrganization);
        (ChannelService.getByTypeAndConfig as jest.Mock).mockResolvedValue(mockChannel);
        (ConversationService.getOrCreate as jest.Mock).mockResolvedValue('conv-123');
        (MessageProcessor.prototype.processMessage as jest.Mock).mockResolvedValue('Sure, I can help!');

        const mockPostMessage = jest.fn().mockResolvedValue(true);
        (SlackWebAPIClient as jest.Mock).mockImplementation(() => ({
          postMessage: mockPostMessage,
        }));

        await request(app)
          .post('/webhook/slack/events')
          .send(mentionEvent)
          .expect(200);

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(MessageProcessor.prototype.processMessage).toHaveBeenCalled();
      });

      it('should validate signature in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        await request(app)
          .post('/webhook/slack/events')
          .set('x-slack-signature', 'invalid-signature')
          .set('x-slack-request-timestamp', '1234567890')
          .send(messageEvent)
          .expect(401);

        process.env.NODE_ENV = originalEnv;
      });

      it('should ignore unhandled event types', async () => {
        const unknownEvent = {
          type: 'event_callback',
          team_id: 'T123456',
          event: {
            type: 'unknown_event',
          },
        };

        await request(app)
          .post('/webhook/slack/events')
          .send(unknownEvent)
          .expect(200);

        expect(OrganizationService.getBySlackWorkspace).not.toHaveBeenCalled();
      });
    });

    describe('OAuth Flow', () => {
      it('should exchange code for access token successfully', async () => {
        const mockOAuthResponse = {
          ok: true,
          access_token: 'xoxb-test-token',
          scope: 'chat:write,channels:history',
          team: { id: 'T123456', name: 'Test Workspace' },
          bot_user_id: 'U123456',
        };

        global.fetch = jest.fn().mockResolvedValue({
          json: jest.fn().mockResolvedValue(mockOAuthResponse),
        });

        (OrganizationService.update as jest.Mock).mockResolvedValue({});
        (ChannelService.createOrUpdate as jest.Mock).mockResolvedValue({});

        const response = await request(app)
          .get('/webhook/slack/oauth/redirect')
          .query({ code: 'test-code', state: 'org-123' })
          .expect(302);

        expect(response.headers.location).toBe('/slack/success');
        expect(OrganizationService.update).toHaveBeenCalledWith('org-123', {
          slack_workspace_id: 'T123456',
        });
      });

      it('should handle OAuth errors', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          json: jest.fn().mockResolvedValue({ ok: false, error: 'invalid_code' }),
        });

        await request(app)
          .get('/webhook/slack/oauth/redirect')
          .query({ code: 'invalid-code' })
          .expect(400);
      });

      it('should return 400 when code is missing', async () => {
        await request(app)
          .get('/webhook/slack/oauth/redirect')
          .expect(400);
      });
    });
  });
});