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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { SwapTransaction } from '../prisma/types.js';
import { AssignBatteryDto } from './assign-battery.dto.js';
import { AssignmentService } from './assignment.service.js';
import { CompleteSwapDto } from './complete-swap.dto.js';
import { CreateSwapDto } from './create-swap.dto.js';
import { UpdateSwapDto } from './update-swap.dto.js';
import { SwapsService } from './swaps.service.js';

const swapCompleteActions = [
  'collected',
  'installed',
  'completed',
  'failed',
  'cancelled',
] as const;

@ApiTags('Swaps')
@Controller('swaps')
export class SwapsController {
  constructor(
    private readonly swapsService: SwapsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  @Post('assign')
  @ApiOperation({
    summary: 'Start a swap by assigning a battery at a station',
    description:
      'Creates a swap transaction and assigns an available battery for the rider, bike, and station.',
  })
  @ApiCreatedResponse({ description: 'Swap started with battery assignment' })
  @ApiBadRequestResponse({ description: 'Validation or business rule failure' })
  assignBattery(@Body() assignBatteryDto: AssignBatteryDto) {
    return this.assignmentService.assignBattery(assignBatteryDto);
  }

  @Post(':id/complete/:action')
  @ApiOperation({
    summary: 'Advance or finalize a swap workflow step',
    description:
      'Updates swap status for the given action (e.g. collected, installed, completed, failed, cancelled).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Swap transaction ID' })
  @ApiParam({
    name: 'action',
    enum: swapCompleteActions,
    description: 'Workflow step to record',
  })
  @ApiOkResponse({ description: 'Updated swap transaction' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  @ApiBadRequestResponse({ description: 'Invalid action or state transition' })
  completeSwap(
    @Param('id', ParseIntPipe) id: number,
    @Param('action') action: (typeof swapCompleteActions)[number],
    @Body() body: CompleteSwapDto,
  ) {
    return this.assignmentService.completeSwap(id, action, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all swap transactions' })
  @ApiOkResponse({ description: 'All swaps' })
  findAll(): Promise<SwapTransaction[]> {
    return this.swapsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get swap transaction by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Swap record' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a swap transaction (manual / admin)' })
  @ApiCreatedResponse({ description: 'Created swap' })
  create(@Body() createSwapDto: CreateSwapDto): Promise<SwapTransaction> {
    return this.swapsService.create(createSwapDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a swap transaction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated swap' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSwapDto: UpdateSwapDto,
  ): Promise<SwapTransaction> {
    return this.swapsService.update(id, updateSwapDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a swap transaction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted swap' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.remove(id);
  }
}
