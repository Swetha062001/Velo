import type { Request, Response } from 'express';
import { healthService } from './health.service.js';

export const healthController = {
  async get(_req: Request, res: Response) {
    const health = await healthService.getStatus();
    // 503 lets uptime monitors detect a missing database; the body still explains why.
    res.status(health.status === 'ok' ? 200 : 503).json({ data: health });
  },
};
