import { api } from '../lib/apiClient.ts';
import type { HealthStatus } from '../types/api.ts';

export const healthService = {
  get: (signal?: AbortSignal) => api.get<HealthStatus>('/health', { signal }),
};
