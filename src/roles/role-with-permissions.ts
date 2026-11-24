import type { Role } from '../prisma/types.js';

export type RoleWithPermissions = Role & {
  permissions: string[];
};