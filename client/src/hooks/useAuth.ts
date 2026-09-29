import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useLogin() {
  const setUser = useSetCurrentUser();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: setUser,
    meta: { ignoreUnauthorized: true }, // wrong password → 401, not a lost session
  });
}

export function useRegister() {
  const setUser = useSetCurrentUser();
  return useMutation({ mutationFn: authService.register, onSuccess: setUser });
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
