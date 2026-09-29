import { env } from '../../config/env.js';

export interface HealthStatus {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

// Phase 4 adds a database connectivity check here.
export const healthService = {
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  },
};
