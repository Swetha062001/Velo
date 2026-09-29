import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

/** Mounts every feature module under /api/v1. Add new modules here. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
