import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { SwapsController } from './swaps.controller.js';
import { SwapsService } from './swaps.service.js';

@Module({
  controllers: [SwapsController],
  providers: [SwapsService, PrismaService],
  exports: [SwapsService],
})
export class SwapsModule {}
