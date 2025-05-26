import express from 'express';
import { config } from '../src/config';
import { whatsappRouter } from '../src/api/webhooks/whatsapp';
import { slackRouter } from '../src/api/webhooks/slack';
import { logger } from '../src/utils/logger';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhooks
app.use('/webhook/whatsapp', whatsappRouter);
app.use('/webhook/slack', slackRouter);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('\n📡 Webhook endpoints:');
  console.log(`- WhatsApp: http://localhost:${PORT}/webhook/whatsapp/:orgSlug`);
  console.log(`- Slack: http://localhost:${PORT}/webhook/slack/events`);
  console.log(`- Health: http://localhost:${PORT}/health`);
});