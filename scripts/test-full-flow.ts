import express from 'express';
import axios from 'axios';
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
const server = app.listen(PORT, () => {
  logger.info(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  
  // Run tests after server starts
  setTimeout(runTests, 2000);
});

async function runTests() {
  console.log('\n🧪 Running integration tests...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthRes = await axios.get(`http://localhost:${PORT}/health`);
    console.log('✅ Health check:', healthRes.data);
    
    // 2. Test WhatsApp webhook
    console.log('\n2️⃣ Testing WhatsApp webhook...');
    const whatsappData = new URLSearchParams({
      From: 'whatsapp:+5491123456789',
      To: '+13343104976',
      Body: 'Hola, necesito ayuda con mi pedido #12345',
      MessageSid: 'SM' + Date.now(),
      ProfileName: 'Juan Test'
    });
    
    try {
      const whatsappRes = await axios.post(
        `http://localhost:${PORT}/webhook/whatsapp/test-company`,
        whatsappData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      console.log('✅ WhatsApp response:', whatsappRes.status, whatsappRes.data);
    } catch (error: any) {
      console.log('❌ WhatsApp error:', error.response?.status, error.response?.data || error.message);
    }
    
    // 3. Test Slack webhook
    console.log('\n3️⃣ Testing Slack webhook...');
    const slackEvent = {
      type: 'event_callback',
      team_id: 'T123456789',
      event: {
        type: 'message',
        channel: 'C123456789',
        user: 'U987654321',
        text: 'Hey bot, what is the weather today?',
        ts: Date.now() / 1000 + ''
      }
    };
    
    try {
      const slackRes = await axios.post(
        `http://localhost:${PORT}/webhook/slack/events`,
        slackEvent,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Slack-Request-Timestamp': Math.floor(Date.now() / 1000) + ''
          }
        }
      );
      console.log('✅ Slack response:', slackRes.status, slackRes.data);
    } catch (error: any) {
      console.log('❌ Slack error:', error.response?.status, error.response?.data || error.message);
    }
    
    // 4. Test URL verification
    console.log('\n4️⃣ Testing Slack URL verification...');
    const challenge = 'test-challenge-' + Date.now();
    const verifyRes = await axios.post(
      `http://localhost:${PORT}/webhook/slack/events`,
      {
        type: 'url_verification',
        challenge: challenge
      }
    );
    console.log('✅ URL verification:', verifyRes.data.challenge === challenge ? 'PASSED' : 'FAILED');
    
    console.log('\n✨ All tests completed!');
    console.log('\n📝 Check the logs above for any errors.');
    console.log('💡 The server will continue running. Press Ctrl+C to stop.\n');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});