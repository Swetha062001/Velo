import type { Request, Response } from 'express';
import { ok } from '../../utils/respond.js';
import { healthService } from './health.service.js';

export const healthController = {
  get(_req: Request, res: Response) {
    ok(res, healthService.getStatus());
  },
};
