import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AssignBatteryDto } from './assign-battery.dto.js';
import { AssignmentService } from './assignment.service.js';

@Controller('swaps')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('assign')
  assignBattery(@Body() assignBatteryDto: AssignBatteryDto) {
    return this.assignmentService.assignBattery(assignBatteryDto);
  }

  @Post(':id/complete/:action')
  completeSwap(
    @Param('id', ParseIntPipe) id: number,
    @Param('action') action: 'collected' | 'installed' | 'completed' | 'failed' | 'cancelled',
  ) {
    return this.assignmentService.completeSwap(id, action);
  }
}
