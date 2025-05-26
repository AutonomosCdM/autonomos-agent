import { Router } from 'express';
import twilio from 'twilio';
import { logger } from '../../utils/logger';
import { 
  OrganizationService, 
  ChannelService, 
  ConversationService
} from '../../services/database';
import { MessageProcessor } from '../../services/message-processor';
import { config } from '../../config';

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
    const { From, To, Body, MessageSid, ProfileName } = req.body;
    
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

    // Validate Twilio signature
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    if (twilioSignature && channel.configuration.twilio_auth_token) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const url = `${protocol}://${host}${req.originalUrl}`;
      
      const isValid = twilio.validateRequest(
        channel.configuration.twilio_auth_token as string,
        twilioSignature,
        url,
        req.body
      );

      if (!isValid && config.nodeEnv === 'production') {
        logger.warn('Invalid Twilio signature for channel', { channelId: channel.id, url });
        return res.status(401).send('Unauthorized');
      }
    }

    // Get or create conversation
    const conversationId = await ConversationService.getOrCreate(
      organization.id,
      channel.id,
      From,
      { 
        user_phone: From,
        user_name: ProfileName || From
      }
    );

    // Store user message
    await ConversationService.addMessage(
      organization.id,
      conversationId,
      'user',
      Body,
      { 
        message_sid: MessageSid,
        profile_name: ProfileName
      }
    );

    // Process message with AI
    const messageProcessor = new MessageProcessor();
    
    try {
      const aiResponse = await messageProcessor.processMessage({
        organizationId: organization.id,
        channelId: channel.id,
        conversationId,
        messageContent: Body,
        metadata: { 
          message_sid: MessageSid,
          user_name: ProfileName || From
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

      // Send response via Twilio
      const twilioClient = twilio(
        channel.configuration.twilio_account_sid as string,
        channel.configuration.twilio_auth_token as string
      );

      const sentMessage = await twilioClient.messages.create({
        body: aiResponse,
        from: `whatsapp:${To}`,
        to: `whatsapp:${From}`
      });

      logger.info('WhatsApp response sent', { 
        conversationId, 
        responseLength: aiResponse.length,
        messageSid: sentMessage.sid
      });
    } catch (error) {
      logger.error('Error processing WhatsApp message', { error, conversationId });
      
      // Send error message to user
      try {
        const twilioClient = twilio(
          channel.configuration.twilio_account_sid as string,
          channel.configuration.twilio_auth_token as string
        );

        await twilioClient.messages.create({
          body: "Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.",
          from: `whatsapp:${To}`,
          to: `whatsapp:${From}`
        });
      } catch (sendError) {
        logger.error('Error sending error message', { error: sendError });
      }
    }
    
    // Always return 200 to acknowledge receipt
    return res.status(200).send('<Response></Response>');
  } catch (error) {
    logger.error('WhatsApp webhook error', { error, orgSlug });
    return res.status(500).send('Internal Server Error');
  }
});