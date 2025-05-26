import { supabaseAdmin } from '../src/lib/supabase';
import { OrganizationService, ChannelService, AgentService } from '../src/services/database';

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data...');

    // 1. Create test organization
    console.log('Creating organization...');
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Test Company',
        slug: 'test-company',
        settings: {}
      })
      .select()
      .single();

    if (orgError) throw orgError;
    
    const organizationId = org.id;
    console.log(`✅ Organization created: ${organizationId}`);

    // 2. Create WhatsApp channel
    console.log('Creating WhatsApp channel...');
    const whatsappChannel = await ChannelService.create({
      organization_id: organizationId,
      type: 'whatsapp',
      name: 'WhatsApp Test',
      is_active: true,
      configuration: {
        phone_number: '+14155238886', // Twilio sandbox number
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID || 'AC_test',
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN || 'auth_test',
      },
    });
    console.log(`✅ WhatsApp channel created: ${whatsappChannel.id}`);

    // 3. Create Slack channel
    console.log('Creating Slack channel...');
    const slackChannel = await ChannelService.create({
      organization_id: organizationId,
      type: 'slack',
      name: 'Slack Test',
      is_active: true,
      configuration: {
        channel_id: 'C123456789',
        slack_bot_token: process.env.SLACK_BOT_TOKEN || 'xoxb-test',
        team_id: 'T123456789',
        team_name: 'Test Workspace',
      },
    });
    console.log(`✅ Slack channel created: ${slackChannel.id}`);

    // 4. Create AI agent
    console.log('Creating AI agent...');
    const agent = await AgentService.create({
      organization_id: organizationId,
      name: 'Test Assistant',
      description: 'A helpful test assistant',
      system_prompt: `You are a helpful assistant for Test Company. 
Be friendly, professional, and concise in your responses.
Always try to help users with their questions.`,
      model: 'anthropic/claude-3-haiku',
      is_active: true,
      configuration: {
        temperature: 0.7,
        max_tokens: 500,
      },
    });
    console.log(`✅ Agent created: ${agent.id}`);

    // 5. Assign agent to channels
    console.log('Assigning agent to channels...');
    await AgentService.assignToChannel(agent.id, whatsappChannel.id, true);
    await AgentService.assignToChannel(agent.id, slackChannel.id, true);
    console.log('✅ Agent assigned to channels');

    // 6. Update organization with Slack workspace ID
    // NOTE: Commented out as column doesn't exist yet
    // await OrganizationService.update(organizationId, {
    //   slack_workspace_id: 'T123456789',
    // } as any);

    console.log('\n📋 Test data created successfully!');
    console.log('\n🔑 Use these values for testing:');
    console.log(`- Organization slug: test-company`);
    console.log(`- Organization ID: ${organizationId}`);
    console.log(`- WhatsApp channel ID: ${whatsappChannel.id}`);
    console.log(`- Slack channel ID: ${slackChannel.id}`);
    console.log(`- Agent ID: ${agent.id}`);
    console.log('\n🌐 Webhook URLs:');
    console.log(`- WhatsApp: http://localhost:3000/webhook/whatsapp/test-company`);
    console.log(`- Slack: http://localhost:3000/webhook/slack/events`);

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run the setup
setupTestData();