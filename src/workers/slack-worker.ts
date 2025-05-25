import { SlackMessageMonitor } from '../services/slack/message-monitor';
import { logger } from '../utils/logger';

class SlackWorkerManager {
  private monitors: Map<string, SlackMessageMonitor> = new Map();

  async startMonitor(channelId: string, organizationSlug: string) {
    const key = `${organizationSlug}:${channelId}`;
    
    if (this.monitors.has(key)) {
      logger.warn('Slack monitor already running for channel', { channelId, organizationSlug });
      return;
    }

    const monitor = new SlackMessageMonitor(channelId, organizationSlug);
    this.monitors.set(key, monitor);
    
    await monitor.start(5000); // Check every 5 seconds
    
    logger.info('Started Slack monitor', { channelId, organizationSlug });
  }

  async stopMonitor(channelId: string, organizationSlug: string) {
    const key = `${organizationSlug}:${channelId}`;
    const monitor = this.monitors.get(key);
    
    if (monitor) {
      await monitor.stop();
      this.monitors.delete(key);
      logger.info('Stopped Slack monitor', { channelId, organizationSlug });
    }
  }

  async stopAllMonitors() {
    logger.info('Stopping all Slack monitors...');
    
    const stopPromises = Array.from(this.monitors.values()).map(monitor => monitor.stop());
    await Promise.all(stopPromises);
    
    this.monitors.clear();
    logger.info('All Slack monitors stopped');
  }

  getActiveMonitors() {
    return Array.from(this.monitors.keys());
  }
}

export const slackWorkerManager = new SlackWorkerManager();

// Start the default monitor for the mejoras_autonomos channel
export async function startSlackWorkers() {
  try {
    await slackWorkerManager.startMonitor('C08TV93SC8M', 'test-org');
    logger.info('Slack workers started');
  } catch (error) {
    logger.error('Failed to start Slack workers:', error);
  }
}

export async function stopSlackWorkers() {
  await slackWorkerManager.stopAllMonitors();
  logger.info('Slack workers stopped');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopSlackWorkers();
});

process.on('SIGINT', async () => {
  await stopSlackWorkers();
});