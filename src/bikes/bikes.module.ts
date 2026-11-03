import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { BikesController } from './bikes.controller.js';
import { BikesService } from './bikes.service.js';

@Module({
  controllers: [BikesController],
  providers: [BikesService, PrismaService],
  exports: [BikesService],
})
export class BikesModule {}
