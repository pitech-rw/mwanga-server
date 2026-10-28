import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CardsController } from './cards.controller.js';
import { CardsService } from './cards.service.js';

@Module({
  controllers: [CardsController],
  providers: [CardsService, PrismaService],
  exports: [CardsService],
})
export class CardsModule {}
