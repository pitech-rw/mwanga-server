import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { WalletsController } from './wallets.controller.js';
import { WalletsService } from './wallets.service.js';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, PrismaService],
  exports: [WalletsService],
})
export class WalletsModule {}
