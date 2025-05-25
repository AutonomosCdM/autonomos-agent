import { logger } from '../utils/logger';
import { closeMessageWorker } from './message-worker';
import { closeWebhookWorker } from './webhook-worker';
import { startSlackWorkers, stopSlackWorkers } from './slack-worker';

export async function startWorkers() {
  logger.info('Starting workers...');
  
  // Start BullMQ workers (automatically started when imported)
  logger.info('Message worker started');
  logger.info('Webhook worker started');
  
  // Start Slack monitoring workers
  await startSlackWorkers();
}

export async function stopWorkers() {
  logger.info('Stopping workers...');
  
  await Promise.all([
    closeMessageWorker(),
    closeWebhookWorker(),
    stopSlackWorkers(),
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