import { WebClient } from '@slack/web-api';
import { logger } from '../../utils/logger';

export interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  type: string;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
}

export class SlackWebAPIClient {
  private client: WebClient;
  private channelId: string;

  constructor(token: string, channelId = 'C08TV93SC8M') {
    this.client = new WebClient(token);
    this.channelId = channelId;
  }

  async sendMessage(text: string, threadTs?: string): Promise<boolean> {
    try {
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        text: text,
        thread_ts: threadTs,
      });

      if (result.ok) {
        logger.info('Message sent to Slack', { 
          channel: this.channelId, 
          threadTs,
          ts: result.ts 
        });
        return true;
      } else {
        logger.error('Failed to send Slack message:', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error sending Slack message:', error);
      return false;
    }
  }

  async postMessage(params: { channel: string; text: string; thread_ts?: string }): Promise<boolean> {
    try {
      const result = await this.client.chat.postMessage(params);

      if (result.ok) {
        logger.info('Message sent to Slack', { 
          channel: params.channel, 
          threadTs: params.thread_ts,
          ts: result.ts 
        });
        return true;
      } else {
        logger.error('Failed to send Slack message:', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error sending Slack message:', error);
      return false;
    }
  }

  async getChannelHistory(limit = 10): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.history({
        channel: this.channelId,
        limit: limit,
      });

      if (result.ok && result.messages) {
        return result.messages.map((msg: any) => ({
          text: msg.text || '',
          user: msg.user || '',
          ts: msg.ts || '',
          channel: this.channelId,
          thread_ts: msg.thread_ts,
          type: msg.type || 'message'
        }));
      }

      return [];
    } catch (error) {
      logger.error('Error getting Slack channel history:', error);
      return [];
    }
  }

  async getUserInfo(userId: string): Promise<SlackUser | null> {
    try {
      const result = await this.client.users.info({
        user: userId,
      });

      if (result.ok && result.user) {
        return {
          id: result.user.id!,
          name: result.user.name!,
          real_name: result.user.real_name
        };
      }

      return null;
    } catch (error) {
      logger.error('Error getting Slack user info:', error);
      return null;
    }
  }

  async replyToThread(originalTs: string, text: string): Promise<boolean> {
    return this.sendMessage(text, originalTs);
  }

  async addReaction(messageTs: string, emoji: string): Promise<boolean> {
    try {
      const result = await this.client.reactions.add({
        channel: this.channelId,
        timestamp: messageTs,
        name: emoji,
      });

      if (result.ok) {
        return true;
      } else {
        logger.error('Failed to add Slack reaction:', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error adding Slack reaction:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      
      if (result.ok) {
        logger.info('Slack connection test successful', {
          team: result.team,
          user: result.user,
          bot_id: result.bot_id
        });
        return true;
      } else {
        logger.error('Slack connection test failed:', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error testing Slack connection:', error);
      return false;
    }
  }

  setChannel(channelId: string) {
    this.channelId = channelId;
  }

  getChannelId(): string {
    return this.channelId;
  }
}