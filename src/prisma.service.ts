import { Injectable, OnModuleInit } from '@nestjs/common';
import { db } from './prisma/db.js';

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db = db;

  async onModuleInit() {
    const url = process.env['DATABASE_URL'];

    if (!url) {
      return;
    }

    await this.db.connect({ url });
  }
}
