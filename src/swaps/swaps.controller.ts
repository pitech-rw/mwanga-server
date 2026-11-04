import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { SwapTransaction } from '../prisma/types.js';
import { AssignBatteryDto } from './assign-battery.dto.js';
import { AssignmentService } from './assignment.service.js';
import { CompleteSwapDto } from './complete-swap.dto.js';
import { CreateSwapDto } from './create-swap.dto.js';
import { UpdateSwapDto } from './update-swap.dto.js';
import { SwapsService } from './swaps.service.js';

@Controller('swaps')
export class SwapsController {
  constructor(
    private readonly swapsService: SwapsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  @Post('assign')
  assignBattery(@Body() assignBatteryDto: AssignBatteryDto) {
    return this.assignmentService.assignBattery(assignBatteryDto);
  }

  @Post(':id/complete/:action')
  completeSwap(
    @Param('id', ParseIntPipe) id: number,
    @Param('action') action: 'collected' | 'installed' | 'completed' | 'failed' | 'cancelled',
    @Body() body: CompleteSwapDto,
  ) {
    return this.assignmentService.completeSwap(id, action, body);
  }

  @Get()
  findAll(): Promise<SwapTransaction[]> {
    return this.swapsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.findOne(id);
  }

  @Post()
  create(@Body() createSwapDto: CreateSwapDto): Promise<SwapTransaction> {
    return this.swapsService.create(createSwapDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSwapDto: UpdateSwapDto,
  ): Promise<SwapTransaction> {
    return this.swapsService.update(id, updateSwapDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.remove(id);
  }
}
