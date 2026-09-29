import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/health.service.ts';

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => healthService.get(signal),
    refetchInterval: 30_000,
    retry: false,
  });
}
