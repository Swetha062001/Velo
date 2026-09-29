import { api } from '../lib/apiClient.ts';
import type {
  ChangePasswordValues,
  LoginValues,
  ProfileValues,
  RegisterValues,
} from '../schemas/auth.schemas.ts';
import type { User } from '../types/user.ts';

interface UserResponse {
  user: User;
}

export const authService = {
  /** The signed-in user, or null when there is no valid session. */
  async me(signal?: AbortSignal): Promise<User | null> {
    return (await api.get<{ user: User | null }>('/auth/me', { signal })).user;
  },

  async login(values: LoginValues) {
    return (await api.post<UserResponse>('/auth/login', values)).user;
  },

  async register(values: RegisterValues) {
    return (await api.post<UserResponse>('/auth/register', values)).user;
  },

  logout() {
    return api.post<void>('/auth/logout');
  },

  async updateProfile(values: ProfileValues) {
    return (await api.patch<UserResponse>('/users/me', values)).user;
  },

  async changePassword(values: ChangePasswordValues) {
    return (await api.post<UserResponse>('/users/me/password', values)).user;
  },
};
