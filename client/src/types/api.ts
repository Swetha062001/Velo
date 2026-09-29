export interface HealthStatus {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}
