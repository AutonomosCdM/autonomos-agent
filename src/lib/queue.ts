import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';

// Queue configuration
const redisUrl = new URL(config.redis.url);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
};

// Define job types
export interface MessageJob {
  organizationId: string;
  channelId: string;
  conversationId: string;
  messageContent: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookJob {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  retries?: number;
}

// Create queues
export const messageQueue = new Queue<MessageJob>('messages', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});

export const webhookQueue = new Queue<WebhookJob>('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed webhooks for 7 days
    },
  },
});

// Queue events for monitoring
export const messageQueueEvents = new QueueEvents('messages', { connection });
export const webhookQueueEvents = new QueueEvents('webhooks', { connection });

// Log queue events
messageQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Message job ${jobId} completed`);
});

messageQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Message job ${jobId} failed: ${failedReason}`);
});

webhookQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Webhook job ${jobId} completed`);
});

webhookQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Webhook job ${jobId} failed: ${failedReason}`);
});

// Utility functions
export async function addMessageToQueue(data: MessageJob) {
  const job = await messageQueue.add('process-message', data, {
    priority: 1,
  });
  logger.info(`Added message job ${job.id} to queue`);
  return job;
}

export async function addWebhookToQueue(data: WebhookJob) {
  const job = await webhookQueue.add('send-webhook', data, {
    priority: data.retries ? 2 : 1, // Higher priority for retries
  });
  logger.info(`Added webhook job ${job.id} to queue`);
  return job;
}

// Graceful shutdown
export async function closeQueues() {
  await messageQueue.close();
  await webhookQueue.close();
  await messageQueueEvents.close();
  await webhookQueueEvents.close();
  logger.info('All queues closed');
}