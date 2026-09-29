export interface HealthStatus {
  status: 'ok' | 'degraded';
  environment: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}
