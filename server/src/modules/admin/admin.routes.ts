import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';

/**
 * Every /admin endpoint sits behind this guard: 401 when signed out, 403 for non-admins.
 * Admin features are added here in Phase 10.
 */
export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('ADMIN'));
