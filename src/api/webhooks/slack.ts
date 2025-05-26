import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { 
  OrganizationService, 
  ChannelService, 
  ConversationService 
} from '../../services/database';
import { MessageProcessor } from '../../services/message-processor';
import { SlackWebAPIClient } from '../../services/slack/web-api-client';

export const slackRouter = Router();

// Validate Slack request signature
const validateSlackSignature = (req: Request): boolean => {
  const signature = req.headers['x-slack-signature'] as string;
  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  
  if (!signature || !timestamp) {
    return false;
  }
  
  // Check if request is too old (prevent replay attacks)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false;
  }
  
  // Create the signing string
  const sigBasestring = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  
  // Create a hash using the signing secret
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', config.slack.signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex');
  
  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
};

// Process Slack message event
const processMessageEvent = async (event: any, teamId: string) => {
  try {
    // Ignore bot messages
    if (event.bot_id || event.subtype === 'bot_message') {
      return;
    }
    
    // Find organization by Slack workspace ID
    const organization = await OrganizationService.getBySlackWorkspace(teamId);
    if (!organization) {
      logger.warn('Organization not found for Slack workspace', { teamId });
      return;
    }
    
    // Find Slack channel
    const channel = await ChannelService.getByTypeAndConfig(
      organization.id,
      'slack',
      'channel_id',
      event.channel
    );
    
    if (!channel) {
      logger.debug('Slack channel not configured for AI', { 
        organizationId: organization.id, 
        channelId: event.channel 
      });
      return;
    }
    
    // Get or create conversation
    const conversationId = await ConversationService.getOrCreate(
      organization.id,
      channel.id,
      event.user,
      { 
        slack_thread_ts: event.thread_ts || event.ts,
        slack_channel: event.channel
      }
    );
    
    // Store user message
    await ConversationService.addMessage(
      organization.id,
      conversationId,
      'user',
      event.text,
      { 
        slack_ts: event.ts,
        slack_user: event.user
      }
    );
    
    // Process message with AI
    const messageProcessor = new MessageProcessor();
    const aiResponse = await messageProcessor.processMessage({
      organizationId: organization.id,
      channelId: channel.id,
      conversationId,
      messageContent: event.text,
      metadata: { 
        slack_user: event.user,
        slack_channel: event.channel,
        slack_thread_ts: event.thread_ts || event.ts
      }
    });
    
    // Store AI response
    await ConversationService.addMessage(
      organization.id,
      conversationId,
      'assistant',
      aiResponse,
      { generated_by: 'openrouter' }
    );
    
    // Send response to Slack
    const slackClient = new SlackWebAPIClient(channel.configuration.slack_bot_token as string);
    await slackClient.postMessage({
      channel: event.channel,
      text: aiResponse,
      thread_ts: event.thread_ts || event.ts // Reply in thread
    });
    
    logger.info('Slack message processed', { 
      conversationId, 
      channel: event.channel 
    });
  } catch (error) {
    logger.error('Error processing Slack message', { error, event });
  }
};

// Process app mention event
const processAppMentionEvent = async (event: any, teamId: string) => {
  // Process mentions the same way as messages
  await processMessageEvent(event, teamId);
};

slackRouter.post('/events', async (req: Request, res: Response) => {
  try {
    // URL Verification for Slack
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }
    
    // Validate Slack signature
    if (config.nodeEnv === 'production' && !validateSlackSignature(req)) {
      logger.warn('Invalid Slack signature');
      return res.status(401).send('Unauthorized');
    }
    
    // Handle event callback
    if (req.body.type === 'event_callback') {
      const { event, team_id } = req.body;
      
      // Process different event types
      switch (event.type) {
        case 'message':
          // Process asynchronously
          processMessageEvent(event, team_id).catch(error => {
            logger.error('Error in message event processing', { error });
          });
          break;
          
        case 'app_mention':
          // Process asynchronously
          processAppMentionEvent(event, team_id).catch(error => {
            logger.error('Error in app mention processing', { error });
          });
          break;
          
        default:
          logger.debug('Unhandled Slack event type', { type: event.type });
      }
    }
    
    // Always respond immediately to Slack
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Slack webhook error', { error });
    return res.status(500).send('Internal Server Error');
  }
});

// OAuth redirect endpoint
slackRouter.get('/oauth/redirect', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }
    
    // Exchange code for access token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code: code as string,
      }),
    });
    
    const data = await response.json() as any;
    
    if (!data.ok) {
      logger.error('Slack OAuth error', { error: data.error });
      return res.status(400).send('OAuth failed');
    }
    
    // Store tokens in database
    try {
      // Get organization from state (should be passed during OAuth initiation)
      const organizationId = state as string;
      
      if (organizationId) {
        // Update organization with Slack workspace ID
        await OrganizationService.update(organizationId, {
          slack_workspace_id: data.team.id
        } as any);
        
        // Create or update Slack channel
        await ChannelService.createOrUpdate(organizationId, {
          type: 'slack',
          name: `Slack - ${data.team.name}`,
          is_active: true,
          configuration: {
            team_id: data.team.id,
            team_name: data.team.name,
            slack_bot_token: data.access_token,
            bot_user_id: data.bot_user_id,
            scopes: data.scope.split(',')
          }
        });
        
        logger.info('Slack OAuth successful and stored', { 
          organizationId,
          team_id: data.team.id,
          team_name: data.team.name 
        });
      }
    } catch (error) {
      logger.error('Error storing Slack OAuth data', { error });
    }
    
    // Redirect to success page
    return res.redirect('/slack/success');
  } catch (error) {
    logger.error('Slack OAuth error', { error });
    return res.status(500).send('Internal Server Error');
  }
});