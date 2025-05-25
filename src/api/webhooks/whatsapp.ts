import { Router } from 'express';
import twilio from 'twilio';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { 
  OrganizationService, 
  ChannelService, 
  ConversationService,
  AgentService 
} from '../../services/database';

export const whatsappRouter = Router();

whatsappRouter.post('/:orgSlug', async (req, res) => {
  const { orgSlug } = req.params;
  
  try {
    // Get organization
    const organization = await OrganizationService.getBySlug(orgSlug);
    if (!organization) {
      logger.warn('Organization not found', { orgSlug });
      return res.status(404).send('Not Found');
    }

    // Extract WhatsApp data
    const { From, To, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      return res.status(400).send('Invalid request');
    }

    // Find the channel for this WhatsApp number
    const channel = await ChannelService.getByTypeAndConfig(
      organization.id,
      'whatsapp',
      'phone_number',
      To
    );

    if (!channel) {
      logger.warn('WhatsApp channel not found', { organizationId: organization.id, phoneNumber: To });
      return res.status(404).send('Channel not found');
    }

    // TODO: Validate Twilio signature
    // const twilioSignature = req.headers['x-twilio-signature'] as string;
    // const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // const isValid = twilio.validateRequest(
    //   channel.configuration.twilio_auth_token as string,
    //   twilioSignature,
    //   url,
    //   req.body
    // );

    // Get or create conversation
    const conversationId = await ConversationService.getOrCreate(
      organization.id,
      channel.id,
      From,
      { user_phone: From }
    );

    // Store user message
    await ConversationService.addMessage(
      organization.id,
      conversationId,
      'user',
      Body,
      { message_sid: MessageSid }
    );

    // Get agent for this channel
    const agent = await AgentService.getForChannel(channel.id);
    
    if (!agent) {
      logger.error('No agent configured for channel', { channelId: channel.id });
      return res.status(200).send('<Response></Response>');
    }

    // TODO: Process message with AI agent
    // TODO: Send response via Twilio
    
    res.status(200).send('<Response></Response>');
  } catch (error) {
    logger.error('WhatsApp webhook error', { error, orgSlug });
    res.status(500).send('Internal Server Error');
  }
});