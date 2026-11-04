import { Module } from '@nestjs/common';
import { BatteriesController } from './batteries.controller.js';
import { BatteriesService } from './batteries.service.js';

@Module({
  controllers: [BatteriesController],
  providers: [BatteriesService],
  exports: [BatteriesService],
})
export class BatteriesModule {}
