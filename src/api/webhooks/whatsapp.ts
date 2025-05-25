import { Router } from 'express';
import { logger } from '../../utils/logger';

export const whatsappRouter = Router();

whatsappRouter.post('/:orgId', async (req, res) => {
  const { orgId } = req.params;
  
  try {
    logger.info('WhatsApp webhook received', { orgId, body: req.body });
    
    // TODO: Validate Twilio signature
    // TODO: Process message
    // TODO: Send response
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('WhatsApp webhook error', { error, orgId });
    res.status(500).send('Internal Server Error');
  }
});