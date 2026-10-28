import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { OwnersController } from './owners.controller.js';
import { OwnersService } from './owners.service.js';

@Module({
  controllers: [OwnersController],
  providers: [OwnersService, PrismaService],
  exports: [OwnersService],
})
export class OwnersModule {}
