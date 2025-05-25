import { Router } from 'express';
import twilio from 'twilio';
import { logger } from '../../utils/logger';
import { 
  OrganizationService, 
  ChannelService, 
  ConversationService
} from '../../services/database';
import { MessageProcessor } from '../../services/message-processor';

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

    // Process message with AI
    const messageProcessor = new MessageProcessor();
    
    try {
      const aiResponse = await messageProcessor.processMessage({
        organizationId: organization.id,
        channelId: channel.id,
        conversationId,
        messageContent: Body,
        metadata: { message_sid: MessageSid }
      });

      // Send response via Twilio
      const twilioClient = twilio(
        channel.configuration.twilio_account_sid as string,
        channel.configuration.twilio_auth_token as string
      );

      await twilioClient.messages.create({
        body: aiResponse,
        from: `whatsapp:${To}`,
        to: `whatsapp:${From}`
      });

      logger.info('WhatsApp response sent', { 
        conversationId, 
        responseLength: aiResponse.length 
      });
    } catch (error) {
      logger.error('Error processing WhatsApp message', { error, conversationId });
    }
    
    // Always return 200 to acknowledge receipt
    return res.status(200).send('<Response></Response>');
  } catch (error) {
    logger.error('WhatsApp webhook error', { error, orgSlug });
    return res.status(500).send('Internal Server Error');
  }
});