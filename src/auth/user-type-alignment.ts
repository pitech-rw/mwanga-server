import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UserTypeName } from './permission-catalog.js';
import type { PrismaService } from '../prisma.service.js';

export function assertUserTypeMatchesRole(type: string, roleName: string): void {
  if (type !== roleName) {
    throw new ForbiddenException(
      `Account misconfigured: User.type "${type}" does not match Role.name "${roleName}"`,
    );
  }
}

export async function resolveRoleIdForType(
  prisma: PrismaService,
  type: UserTypeName,
): Promise<number> {
  const role = await prisma.db.orm.public.Role.first({ name: type });

  if (!role) {
    throw new BadRequestException(
      `Role "${type}" is not provisioned. Run npm run seed:permissions.`,
    );
  }

  return role.id;
}
