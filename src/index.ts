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
app.get('/health', async (req, res) => {
  try {
    // TODO: Add Redis health check
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString() 
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
    // Start workers
    await startWorkers();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Autonomos Agent running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await closeQueues();
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