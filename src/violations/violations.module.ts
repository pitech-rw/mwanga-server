import { Module } from '@nestjs/common';
import { ViolationsController } from './violations.controller.js';
import { ViolationsService } from './violations.service.js';

@Module({
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService],
})
export class ViolationsModule {}
