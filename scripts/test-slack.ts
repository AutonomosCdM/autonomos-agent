#!/usr/bin/env ts-node

import { SlackCLIClient } from '../src/services/slack/cli-client';

async function testSlackConnection() {
  const slackClient = new SlackCLIClient('C08TV93SC8M');
  
  console.log('🔄 Testing Slack CLI connection...');
  
  try {
    // Test 1: Get channel history
    console.log('\n📝 Test 1: Getting channel history...');
    const messages = await slackClient.getChannelHistory(5);
    console.log(`✅ Found ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('Latest message preview:');
      console.log(`  User: ${messages[0].user}`);
      console.log(`  Text: ${messages[0].text.substring(0, 100)}...`);
      console.log(`  Timestamp: ${messages[0].ts}`);
    }
    
    // Test 2: Send a test message
    console.log('\n💬 Test 2: Sending test message...');
    const testMessage = `🤖 Autonomos Agent test - ${new Date().toISOString()}`;
    const sent = await slackClient.sendMessage(testMessage);
    
    if (sent) {
      console.log('✅ Test message sent successfully');
    } else {
      console.log('❌ Failed to send test message');
    }
    
    // Test 3: Get user info (if we have a user from history)
    if (messages.length > 0 && messages[0].user) {
      console.log('\n👤 Test 3: Getting user info...');
      const userInfo = await slackClient.getUserInfo(messages[0].user);
      
      if (userInfo) {
        console.log(`✅ User info: ${userInfo.name} (${userInfo.real_name})`);
      } else {
        console.log('❌ Failed to get user info');
      }
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if Slack CLI is available
async function checkSlackCLI() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('slack --version');
    console.log(`✅ Slack CLI found: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ Slack CLI not found. Please install it first:');
    console.error('   npm install -g @slack/cli');
    console.error('   Or: https://api.slack.com/automation/cli');
    return false;
  }
}

async function main() {
  console.log('🚀 Autonomos Agent - Slack Integration Test\n');
  
  const cliAvailable = await checkSlackCLI();
  if (!cliAvailable) {
    process.exit(1);
  }
  
  await testSlackConnection();
}

if (require.main === module) {
  main().catch(console.error);
}