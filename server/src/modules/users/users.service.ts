import { AppError } from '../../utils/AppError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { issueSessionToken } from '../auth/auth.service.js';
import { usersRepository } from './users.repository.js';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas.js';

export const usersService = {
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await usersRepository.updateName(userId, input.name);
    if (!user) throw AppError.notFound('User not found');
    return user;
  },

  /**
   * Verifies the current password, stores the new hash and revokes every existing
   * session (token_version bump). Returns a fresh token for the current device.
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    if (!(await verifyPassword(input.currentPassword, user.password_hash))) {
      throw AppError.validation([
        { path: 'body.currentPassword', message: 'Current password is incorrect' },
      ]);
    }

    const updated = await usersRepository.updatePassword(
      userId,
      await hashPassword(input.newPassword),
    );
    if (!updated) throw AppError.notFound('User not found');

    return { user: updated, token: issueSessionToken(updated) };
  },
};
