import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/database';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  organizationId?: string;
  apiKeyId?: string;
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    const validation = await AuthService.validateApiKey(apiKey);

    if (!validation) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Attach organization info to request
    req.organizationId = validation.organization_id;
    req.apiKeyId = validation.key_id;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (apiKey) {
      const validation = await AuthService.validateApiKey(apiKey);
      if (validation) {
        req.organizationId = validation.organization_id;
        req.apiKeyId = validation.key_id;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
}