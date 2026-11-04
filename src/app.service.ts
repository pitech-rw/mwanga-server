import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const { userCount } = await this.prisma.db.orm.public.User.aggregate((aggregate) => ({
      userCount: aggregate.count(),
    }));

    return {
      ok: true,
      database: 'postgres',
      userCount,
      timestamp: new Date().toISOString(),
    };
  }
}
