import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MessageProcessor } from '../services/message-processor';
import type { MessageJob } from '../lib/queue';

const connection = {
  host: new URL(config.redis.url).hostname,
  port: parseInt(new URL(config.redis.url).port || '6379'),
};

const messageProcessor = new MessageProcessor();

export const messageWorker = new Worker<MessageJob>(
  'messages',
  async (job: Job<MessageJob>) => {
    const { organizationId, channelId, conversationId, messageContent, metadata } = job.data;

    logger.info(`Processing message job ${job.id}`, {
      organizationId,
      conversationId,
    });

    try {
      const response = await messageProcessor.processMessage({
        organizationId,
        channelId,
        conversationId,
        messageContent,
        metadata,
      });

      logger.info(`Message job ${job.id} completed successfully`, {
        responseLength: response.length,
      });

      return { success: true, response };
    } catch (error) {
      logger.error(`Message job ${job.id} failed`, { error });
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process up to 10 messages concurrently
    limiter: {
      max: 100,
      duration: 60000, // Max 100 jobs per minute
    },
  }
);

// Worker event handlers
messageWorker.on('completed', (job) => {
  logger.info(`Worker completed job ${job.id}`);
});

messageWorker.on('failed', (job, err) => {
  logger.error(`Worker failed job ${job?.id}`, { error: err });
});

messageWorker.on('error', (err) => {
  logger.error('Worker error', { error: err });
});

// Graceful shutdown
export async function closeMessageWorker() {
  await messageWorker.close();
  logger.info('Message worker closed');
}