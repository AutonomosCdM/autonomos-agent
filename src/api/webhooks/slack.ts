import { Router } from 'express';
import { logger } from '../../utils/logger';

export const slackRouter = Router();

slackRouter.post('/events', async (req, res) => {
  try {
    logger.info('Slack event received', { body: req.body });
    
    // URL Verification for Slack
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }
    
    // TODO: Validate Slack signature
    // TODO: Process event
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Slack webhook error', { error });
    res.status(500).send('Internal Server Error');
  }
});