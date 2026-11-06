import type { UserType } from '../prisma/types.js';

export type JwtPayload = {
  sub: number;
  username: string;
  type: UserType;
  roleId: number;
  /** Populated for station operators (User.type=swapper); null otherwise */
  stationId: number | null;
  /** True when the user's role includes system:admin (embedded so read paths avoid extra DB hits). */
  adminBypass: boolean;
};

export type AuthenticatedUser = JwtPayload;
