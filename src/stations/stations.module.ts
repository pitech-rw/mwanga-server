import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { StationsController } from './stations.controller.js';
import { StationsService } from './stations.service.js';

@Module({
  controllers: [StationsController],
  providers: [StationsService, PrismaService],
  exports: [StationsService],
})
export class StationsModule {}
