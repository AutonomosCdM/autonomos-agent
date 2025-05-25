import { WebClient } from '@slack/web-api';
import { logger } from '../../utils/logger';
import { config } from '../../config';

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

export class SlackCLIClient {
  private channelId: string;

  constructor(channelId = 'C08TV93SC8M') { // Default to #mejoras_autonomos
    this.channelId = channelId;
  }

  async sendMessage(text: string, threadTs?: string): Promise<boolean> {
    try {
      let command = `slack chat send --channel ${this.channelId} --text "${text.replace(/"/g, '\\"')}"`;
      
      if (threadTs) {
        command += ` --thread-ts ${threadTs}`;
      }

      const { stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error('Slack CLI error sending message:', stderr);
        return false;
      }

      logger.info('Message sent to Slack', { channel: this.channelId, threadTs });
      return true;
    } catch (error) {
      logger.error('Error sending Slack message:', error);
      return false;
    }
  }

  async getChannelHistory(limit = 10): Promise<SlackMessage[]> {
    try {
      const command = `slack conversations history --channel ${this.channelId} --limit ${limit} --format json`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error('Slack CLI error getting history:', stderr);
        return [];
      }

      const response = JSON.parse(stdout);
      
      if (response.ok && response.messages) {
        return response.messages.map((msg: any) => ({
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
      const command = `slack users info --user ${userId} --format json`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error('Slack CLI error getting user info:', stderr);
        return null;
      }

      const response = JSON.parse(stdout);
      
      if (response.ok && response.user) {
        return {
          id: response.user.id,
          name: response.user.name,
          real_name: response.user.real_name
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
      const command = `slack reactions add --channel ${this.channelId} --timestamp ${messageTs} --name ${emoji}`;
      
      const { stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error('Slack CLI error adding reaction:', stderr);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error adding Slack reaction:', error);
      return false;
    }
  }

  setChannel(channelId: string) {
    this.channelId = channelId;
  }
}