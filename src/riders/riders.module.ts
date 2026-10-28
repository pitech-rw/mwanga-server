import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { RidersController } from './riders.controller.js';
import { RidersService } from './riders.service.js';

@Module({
  controllers: [RidersController],
  providers: [RidersService, PrismaService],
  exports: [RidersService],
})
export class RidersModule {}
