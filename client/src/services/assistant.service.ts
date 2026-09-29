import { api } from '../lib/apiClient.ts';
import type {
  AssistantReply,
  AssistantStatus,
  AssistantTurn,
  ShoppingIntent,
} from '../types/assistant.ts';

export const assistantService = {
  status: (signal?: AbortSignal) => api.get<AssistantStatus>('/ai/status', { signal }),
  ask: (message: string, history: AssistantTurn[], context?: ShoppingIntent) =>
    api.post<AssistantReply>('/ai/assistant', { message, history, context }),
};
