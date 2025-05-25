import express from 'express';
import { config } from './config';
import { whatsappRouter } from './api/webhooks/whatsapp';
import { slackRouter } from './api/webhooks/slack';
import { logger } from './utils/logger';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoints
app.use('/webhook/whatsapp', whatsappRouter);
app.use('/webhook/slack', slackRouter);

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Autonomos Agent running on port ${PORT}`);
});