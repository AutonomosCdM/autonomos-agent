import { spawn, ChildProcess } from 'child_process';
import { logger } from '../../utils/logger';

export interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  channel: string;
  thread_ts?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

export class SlackMCPClient {
  private process: ChildProcess | null = null;
  private messageCallbacks: ((message: SlackMessage) => void)[] = [];

  constructor() {
    this.startMCPProcess();
  }

  private startMCPProcess() {
    try {
      // Start the Slack MCP server
      this.process = spawn('npx', ['@modelcontextprotocol/server-slack'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Add any Slack-specific environment variables here
        }
      });

      this.process.stdout?.on('data', (data) => {
        this.handleMCPOutput(data.toString());
      });

      this.process.stderr?.on('data', (data) => {
        logger.error('Slack MCP stderr:', data.toString());
      });

      this.process.on('close', (code) => {
        logger.warn(`Slack MCP process exited with code ${code}`);
        // Restart the process after a delay
        setTimeout(() => this.startMCPProcess(), 5000);
      });

      logger.info('Slack MCP client started');
    } catch (error) {
      logger.error('Failed to start Slack MCP process:', error);
    }
  }

  private handleMCPOutput(output: string) {
    try {
      // Parse JSON-RPC messages from MCP
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          this.processMessage(message);
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    } catch (error) {
      logger.error('Error handling MCP output:', error);
    }
  }

  private processMessage(message: any) {
    // Handle different types of MCP messages
    if (message.method === 'slack/message_received') {
      const slackMessage: SlackMessage = message.params;
      this.messageCallbacks.forEach(callback => callback(slackMessage));
    }
  }

  async sendMessage(channelId: string, text: string, threadTs?: string): Promise<boolean> {
    try {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'slack/send_message',
        params: {
          channel: channelId,
          text: text,
          thread_ts: threadTs
        }
      };

      if (this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(request) + '\n');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error sending Slack message:', error);
      return false;
    }
  }

  async getChannelInfo(channelId: string): Promise<SlackChannel | null> {
    try {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'slack/get_channel',
        params: {
          channel: channelId
        }
      };

      if (this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(request) + '\n');
        // Note: This is simplified. In a real implementation, you'd need to handle the async response
        return null;
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting channel info:', error);
      return null;
    }
  }

  async getChannelHistory(channelId: string, limit = 10): Promise<SlackMessage[]> {
    try {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'slack/get_messages',
        params: {
          channel: channelId,
          limit: limit
        }
      };

      if (this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(request) + '\n');
        // Note: This is simplified. In a real implementation, you'd need to handle the async response
        return [];
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting channel history:', error);
      return [];
    }
  }

  onMessage(callback: (message: SlackMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  async close() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      logger.info('Slack MCP client closed');
    }
  }
}