import { logger } from '../utils/logger';
import { messageWorker, closeMessageWorker } from './message-worker';
import { webhookWorker, closeWebhookWorker } from './webhook-worker';

export async function startWorkers() {
  logger.info('Starting workers...');
  
  // Workers are automatically started when imported
  logger.info('Message worker started');
  logger.info('Webhook worker started');
}

export async function stopWorkers() {
  logger.info('Stopping workers...');
  
  await Promise.all([
    closeMessageWorker(),
    closeWebhookWorker(),
  ]);
  
  logger.info('All workers stopped');
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers...');
  await stopWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers...');
  await stopWorkers();
  process.exit(0);
});