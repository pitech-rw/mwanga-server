import { Module } from '@nestjs/common';
import { AssignmentController } from './assignment.controller.js';
import { AssignmentService } from './assignment.service.js';
import { SwapsController } from './swaps.controller.js';
import { SwapsService } from './swaps.service.js';

@Module({
  controllers: [SwapsController, AssignmentController],
  providers: [SwapsService, AssignmentService],
  exports: [SwapsService, AssignmentService],
})
export class SwapsModule {}
