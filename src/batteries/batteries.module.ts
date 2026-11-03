import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { BatteriesController } from './batteries.controller.js';
import { BatteriesService } from './batteries.service.js';

@Module({
  controllers: [BatteriesController],
  providers: [BatteriesService, PrismaService],
  exports: [BatteriesService],
})
export class BatteriesModule {}
