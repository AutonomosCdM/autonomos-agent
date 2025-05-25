import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { WebhookJob } from '../lib/queue';

const connection = {
  host: new URL(config.redis.url).hostname,
  port: parseInt(new URL(config.redis.url).port || '6379'),
};

export const webhookWorker = new Worker<WebhookJob>(
  'webhooks',
  async (job: Job<WebhookJob>) => {
    const { url, payload, headers = {} } = job.data;

    logger.info(`Processing webhook job ${job.id}`, { url });

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (response.status >= 400) {
        logger.warn(`Webhook returned error status`, {
          jobId: job.id,
          url,
          status: response.status,
        });
      } else {
        logger.info(`Webhook job ${job.id} completed successfully`, {
          status: response.status,
        });
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Webhook job ${job.id} failed`, { error, url });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 webhooks concurrently
    limiter: {
      max: 50,
      duration: 60000, // Max 50 webhooks per minute
    },
  }
);

// Worker event handlers
webhookWorker.on('completed', (job) => {
  logger.info(`Webhook worker completed job ${job.id}`);
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`Webhook worker failed job ${job?.id}`, { error: err });
});

webhookWorker.on('error', (err) => {
  logger.error('Webhook worker error', { error: err });
});

// Graceful shutdown
export async function closeWebhookWorker() {
  await webhookWorker.close();
  logger.info('Webhook worker closed');
}