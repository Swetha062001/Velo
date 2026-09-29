import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient.ts';

const ME_KEY = ['auth', 'me'];

/**
 * Any 401 means the session is gone (expired, revoked, signed out elsewhere):
 * mark the user as signed out so guarded pages redirect to sign-in.
 */
function handleUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(ME_KEY, null);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // A failed sign-in is a 401 too, but it doesn't mean an existing session ended.
      if (mutation.options.meta?.ignoreUnauthorized) return;
      handleUnauthorized(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Client errors (4xx) won't succeed on retry; network/5xx get two retries.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
