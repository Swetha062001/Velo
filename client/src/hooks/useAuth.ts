import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mergeGuestCartIntoAccount } from '../lib/cartSync.ts';
import { authService } from '../services/auth.service.ts';
import type { User } from '../types/user.ts';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/** Current user (null when signed out). The single client-side source of auth state. */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => authService.me(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

function useSetCurrentUser() {
  const queryClient = useQueryClient();
  return (user: User) => queryClient.setQueryData(authKeys.me, user);
}

/**
 * After sign-in: move any guest bag into the account FIRST (the session cookie is already
 * set), then mark the user signed in. The reverse order would start a cart fetch that could
 * resolve after the merge and overwrite it with the pre-merge cart.
 */
function useSessionStart() {
  const queryClient = useQueryClient();
  return async (user: User) => {
    await mergeGuestCartIntoAccount(queryClient);
    queryClient.setQueryData(authKeys.me, user);
  };
}

export function useLogin() {
  const startSession = useSessionStart();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: startSession,
    meta: { ignoreUnauthorized: true }, // wrong password → 401, not a lost session
  });
}

export function useRegister() {
  const startSession = useSessionStart();
  return useMutation({ mutationFn: authService.register, onSuccess: startSession });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.logout,
    // Even if the request fails, drop every cached user-specific query locally.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

export function useUpdateProfile() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authService.updateProfile, onSuccess: setUser });
}

export function useChangePassword() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authService.changePassword, onSuccess: setUser });
}
