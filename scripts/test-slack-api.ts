#!/usr/bin/env ts-node

import { SlackWebAPIClient } from '../src/services/slack/web-api-client';

async function testSlackWebAPI() {
  console.log('🚀 Testing Slack Web API...\n');
  
  // Check if we have a bot token (you'll need to set this)
  const token = process.env.SLACK_BOT_TOKEN;
  
  if (!token) {
    console.error('❌ SLACK_BOT_TOKEN environment variable not set');
    console.log('\n📝 To get a bot token:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Create a new app or select existing');
    console.log('3. Go to "OAuth & Permissions"');
    console.log('4. Add bot token scopes: channels:history, chat:write, reactions:write, users:read');
    console.log('5. Install app to workspace');
    console.log('6. Copy the "Bot User OAuth Token"');
    console.log('7. Add to .env: SLACK_BOT_TOKEN=xoxb-your-token-here');
    process.exit(1);
  }
  
  const slackClient = new SlackWebAPIClient(token, 'C08TV93SC8M');
  
  try {
    // Test 1: Connection test
    console.log('🔗 Test 1: Testing connection...');
    const connected = await slackClient.testConnection();
    
    if (!connected) {
      console.error('❌ Failed to connect to Slack');
      process.exit(1);
    }
    
    console.log('✅ Connected to Slack successfully');
    
    // Test 2: Get channel history
    console.log('\n📝 Test 2: Getting channel history...');
    const messages = await slackClient.getChannelHistory(3);
    console.log(`✅ Found ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('\nLatest messages:');
      messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. User: ${msg.user}`);
        console.log(`     Text: ${msg.text.substring(0, 100)}...`);
        console.log(`     TS: ${msg.ts}\n`);
      });
    }
    
    // Test 3: Send a test message
    console.log('💬 Test 3: Sending test message...');
    const testMessage = `🤖 Autonomos Agent Web API test - ${new Date().toISOString()}`;
    const sent = await slackClient.sendMessage(testMessage);
    
    if (sent) {
      console.log('✅ Test message sent successfully');
      
      // Test 4: Add reaction to our own message (if we can find it)
      console.log('\n😀 Test 4: Adding reaction...');
      const newMessages = await slackClient.getChannelHistory(1);
      if (newMessages.length > 0) {
        const reacted = await slackClient.addReaction(newMessages[0].ts, 'white_check_mark');
        if (reacted) {
          console.log('✅ Reaction added successfully');
        } else {
          console.log('❌ Failed to add reaction');
        }
      }
    } else {
      console.log('❌ Failed to send test message');
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testSlackWebAPI().catch(console.error);
}