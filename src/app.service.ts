import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Helo Der!';
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
