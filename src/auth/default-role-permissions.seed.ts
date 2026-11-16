import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { syncAllDefaultRolePermissions } from './sync-role-permissions.js';

@Injectable()
export class DefaultRolePermissionsSeed implements OnModuleInit {
  private readonly logger = new Logger(DefaultRolePermissionsSeed.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (!process.env['DATABASE_URL']) {
      return;
    }

    await syncAllDefaultRolePermissions(this.prisma.db);
    this.logger.log('Synced default role permissions');
  }
}
