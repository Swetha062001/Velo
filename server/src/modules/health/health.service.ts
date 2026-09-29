import { env } from '../../config/env.js';
import { pool } from '../../db/index.js';
import { logger } from '../../utils/logger.js';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  environment: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

async function isDatabaseUp() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    logger.warn('Health check: database unreachable', { err });
    return false;
  }
}

export const healthService = {
  async getStatus(): Promise<HealthStatus> {
    const databaseUp = await isDatabaseUp();
    return {
      status: databaseUp ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      database: databaseUp ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  },
};
