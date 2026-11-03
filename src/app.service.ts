import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { UsersModule } from './users/users.module.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const userCount = await this.prisma.user.count();

    return {
      ok: true,
      database: 'postgres',
      userCount,
      timestamp: new Date().toISOString(),
    };
  }
}
