import express from 'express';
import { config } from './config';
import { whatsappRouter } from './api/webhooks/whatsapp';
import { slackRouter } from './api/webhooks/slack';
import { logger } from './utils/logger';
import { startWorkers } from './workers';
import { closeQueues } from './lib/queue';

const app = express();

app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: '0.1.0',
      services: {
        web: 'ok',
        redis: 'not_configured',
        supabase: 'not_configured',
        slack: 'not_configured'
      }
    };

    // Check Redis if configured
    if (config.redis.url !== 'redis://localhost:6379' && config.redis.url !== 'placeholder') {
      health.services.redis = 'configured';
    }

    // Check Supabase if configured
    if (config.supabase.url !== 'http://localhost:54321' && config.supabase.url !== 'placeholder') {
      health.services.supabase = 'configured';
    }

    // Check Slack if configured
    if (config.slack.botToken !== 'placeholder') {
      health.services.slack = 'configured';
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook endpoints
app.use('/webhook/whatsapp', whatsappRouter);
app.use('/webhook/slack', slackRouter);

const PORT = config.port;

// Start server and workers
async function start() {
  try {
    // Start workers only if Redis is enabled and configured
    if (config.redis.enabled) {
      try {
        await startWorkers();
        logger.info('Workers started successfully');
      } catch (error) {
        logger.warn('Workers failed to start, continuing without queue processing', { error });
      }
    } else {
      logger.warn('Redis not enabled, running without workers');
    }
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Autonomos Agent running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        await closeQueues();
      } catch (error) {
        logger.warn('Error closing queues', { error });
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

start();