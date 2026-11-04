import { Module } from '@nestjs/common';
import { BikesController } from './bikes.controller.js';
import { BikesService } from './bikes.service.js';

@Module({
  controllers: [BikesController],
  providers: [BikesService],
  exports: [BikesService],
})
export class BikesModule {}
