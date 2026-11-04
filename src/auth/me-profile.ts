import type { User } from '../prisma/types.js';
import { assertUserTypeMatchesRole } from './user-type-alignment.js';

export type MeProfileView = 'persona' | 'full';

type UserWithRole = User & { role: { id: number; name: string } };

export function buildMeProfile(
  user: UserWithRole,
  permissions: readonly string[],
  view: MeProfileView = 'persona',
) {
  assertUserTypeMatchesRole(user.type, user.role.name);

  const base = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    type: user.type,
    role: {
      id: user.role.id,
      name: user.role.name,
    },
    isActive: user.isActive,
    permissions: [...permissions].sort(),
    lastLoginAt: user.lastLoginAt,
  };

  if (view === 'full') {
    return {
      ...base,
      phone: user.phone,
      address: user.address,
      image: user.image,
      nationalId: user.nationalId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  switch (user.type) {
    case 'rider':
      return {
        ...base,
        image: user.image,
      };
    case 'swapper':
    case 'agent':
      return {
        ...base,
        phone: user.phone,
        image: user.image,
      };
    default:
      return {
        ...base,
        phone: user.phone,
        address: user.address,
        image: user.image,
        nationalId: user.nationalId,
      };
  }
}
