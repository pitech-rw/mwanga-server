import { sanitizeUser } from '../auth/sanitize-user.js';
import { erasedUserPlaceholders } from './erased-user-placeholders.js';

type UserWithSecrets = { passwordHash?: string | null; erasedAt?: Date | null; id: number };

export function presentSafeUser<T extends UserWithSecrets>(user: T): Omit<T, 'passwordHash'> {
  const safe = sanitizeUser(user);
  if (safe.erasedAt == null) {
    return safe;
  }

  const placeholders = erasedUserPlaceholders(safe.id);
  return {
    ...safe,
    ...placeholders,
    isActive: false,
  };
}