import type { UserType } from '../prisma/types.js';

export type JwtPayload = {
  sub: number;
  username: string;
  type: UserType;
  roleId: number;
};

export type AuthenticatedUser = JwtPayload;
