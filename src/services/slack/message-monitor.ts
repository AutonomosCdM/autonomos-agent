import { SlackWebAPIClient, SlackMessage } from './web-api-client';
import { config } from '../../config';
import { ConversationService, ChannelService, OrganizationService } from '../database';
import { MessageProcessor } from '../message-processor';
import { logger } from '../../utils/logger';

export class SlackMessageMonitor {
  private slackClient: SlackWebAPIClient;
  private messageProcessor: MessageProcessor;
  private lastCheckedTs: string | null = null;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly channelId: string;
  private readonly organizationSlug: string;

  constructor(channelId = 'C08TV93SC8M', organizationSlug = 'test-org') {
    this.channelId = channelId;
    this.organizationSlug = organizationSlug;
    this.slackClient = new SlackWebAPIClient(config.slack.botToken, channelId);
    this.messageProcessor = new MessageProcessor();
  }

  async start(intervalMs = 5000) {
    if (this.isRunning) {
      logger.warn('Slack monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Slack message monitor', { 
      channelId: this.channelId,
      intervalMs 
    });

    // Get initial timestamp
    await this.initializeLastCheckedTs();

    // Start polling
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        logger.error('Error in Slack monitor loop:', error);
      }
    }, intervalMs);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Slack message monitor stopped');
  }

  private async initializeLastCheckedTs() {
    try {
      const messages = await this.slackClient.getChannelHistory(1);
      if (messages.length > 0) {
        this.lastCheckedTs = messages[0].ts;
        logger.info('Initialized last checked timestamp', { ts: this.lastCheckedTs });
      }
    } catch (error) {
      logger.error('Error initializing timestamp:', error);
    }
  }

  private async checkForNewMessages() {
    try {
      const messages = await this.slackClient.getChannelHistory(20);
      
      if (messages.length === 0) {
        return;
      }

      // Filter messages newer than last checked
      const newMessages = this.lastCheckedTs 
        ? messages.filter(msg => parseFloat(msg.ts) > parseFloat(this.lastCheckedTs!))
        : messages.slice(-1); // Only process the latest if no last timestamp

      if (newMessages.length === 0) {
        return;
      }

      // Update last checked timestamp
      this.lastCheckedTs = newMessages[0].ts;

      // Process new messages
      for (const message of newMessages.reverse()) { // Process in chronological order
        await this.processSlackMessage(message);
      }
    } catch (error) {
      logger.error('Error checking for new messages:', error);
    }
  }

  private async processSlackMessage(message: SlackMessage) {
    try {
      // Skip bot messages and system messages
      if (!message.user || message.type !== 'message' || !message.text) {
        return;
      }

      // Skip messages from bots (typically start with 'B')
      if (message.user.startsWith('B') || message.user === 'USLACKBOT') {
        return;
      }

      logger.info('Processing Slack message', {
        user: message.user,
        text: message.text.substring(0, 100),
        ts: message.ts
      });

      // Get organization
      const organization = await OrganizationService.getBySlug(this.organizationSlug);
      if (!organization) {
        logger.error('Organization not found', { slug: this.organizationSlug });
        return;
      }

      // Find or create Slack channel
      let channel = await ChannelService.getByTypeAndConfig(
        organization.id,
        'slack',
        'channel_id',
        this.channelId
      );

      if (!channel) {
        // Create channel if it doesn't exist
        channel = await ChannelService.create({
          organization_id: organization.id,
          type: 'slack',
          name: 'Mejoras Autonomos',
          configuration: {
            channel_id: this.channelId,
            channel_name: 'mejoras_autonomos'
          },
          is_active: true
        });
      }

      // Get or create conversation
      const conversationId = await ConversationService.getOrCreate(
        organization.id,
        channel.id,
        message.user,
        {
          slack_user: message.user,
          slack_channel: this.channelId,
          thread_ts: message.thread_ts
        }
      );

      // Store user message
      await ConversationService.addMessage(
        organization.id,
        conversationId,
        'user',
        message.text,
        {
          slack_ts: message.ts,
          slack_user: message.user,
          thread_ts: message.thread_ts
        }
      );

      // Process with AI
      const aiResponse = await this.messageProcessor.processMessage({
        organizationId: organization.id,
        channelId: channel.id,
        conversationId,
        messageContent: message.text,
        metadata: {
          slack_ts: message.ts,
          slack_user: message.user
        }
      });

      // Send response to Slack
      await this.slackClient.replyToThread(message.ts, aiResponse);

      // Add reaction to show we processed it
      await this.slackClient.addReaction(message.ts, 'robot_face');

      logger.info('Slack message processed successfully', {
        conversationId,
        responseLength: aiResponse.length
      });

    } catch (error) {
      logger.error('Error processing Slack message:', error);
      
      // Try to add error reaction
      try {
        await this.slackClient.addReaction(message.ts, 'x');
      } catch (reactionError) {
        logger.error('Failed to add error reaction:', reactionError);
      }
    }
  }
}