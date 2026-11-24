import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { bootstrapDefaultRolePermissions } from './sync-role-permissions.js';

@Injectable()
export class DefaultRolePermissionsSeed implements OnModuleInit {
  private readonly logger = new Logger(DefaultRolePermissionsSeed.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (!process.env['DATABASE_URL']) {
      return;
    }

    await bootstrapDefaultRolePermissions(this.prisma.db);
    this.logger.log('Bootstrapped default role permissions where missing');
  }
}