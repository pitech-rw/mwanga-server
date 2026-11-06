import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { ReadScopeContext } from '../auth/read-scope.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { SwapTransaction } from '../prisma/types.js';
import { AssignBatteryDto } from './assign-battery.dto.js';
import { AssignmentService } from './assignment.service.js';
import { SwapLookupDto } from './swap-lookup.dto.js';
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

@ApiBearerAuth('JWT-auth')
@ApiTags('Swaps')
@Controller('swaps')
export class SwapsController {
  constructor(
    private readonly swapsService: SwapsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get('lookup')
  @RequirePermissions(PERMISSIONS.swaps.operate)
  @ApiOperation({
    operationId: 'swapsLookupGet',
    summary: 'Lookup incoming battery (confirm serial matches bike)',
    description:
      '`GET /swaps/lookup` — query params: **swapperId**, **stationId**, **bikeId**, **serialNumber**. Resolves the serial to a battery and verifies it is **`bikeId`’s current pack** (`bike.currentBatteryId`). Use before **`POST /swaps/assign`** when scanning the returned pack. Assign requires **`incomingBatterySerialNumber`** with the same value whenever the bike still has a mounted battery. **POST /swaps/lookup** is an alternative with the same fields in the JSON body.',
  })
  @ApiQuery({ name: 'swapperId', type: Number, example: 42 })
  @ApiQuery({ name: 'stationId', type: Number, example: 3 })
  @ApiQuery({ name: 'bikeId', type: Number, example: 7 })
  @ApiQuery({ name: 'serialNumber', type: String, example: 'BAT-1042' })
  @ApiOkResponse({
    description: 'Serial matches the bike’s current battery',
    schema: {
      type: 'object',
      required: ['confirmed', 'bikeId', 'stationId', 'incomingBattery'],
      properties: {
        confirmed: { type: 'boolean', example: true },
        bikeId: { type: 'integer', example: 7 },
        stationId: { type: 'integer', example: 3 },
        incomingBattery: {
          type: 'object',
          description: 'Battery row including `station` and `bike` relations',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Empty serial, or serial does not match the battery mounted on the bike',
  })
  @ApiNotFoundResponse({ description: 'Unknown bike id, station id, or battery serial' })
  lookupIncomingBatteryGet(@Query() query: SwapLookupDto) {
    return this.assignmentService.lookupIncomingBattery(query);
  }

  @Post('lookup')
  @RequirePermissions(PERMISSIONS.swaps.operate)
  @ApiOperation({
    operationId: 'swapsLookupPost',
    summary: 'Lookup incoming battery (POST body, same as GET /swaps/lookup)',
    description:
      'Same behavior as **GET /swaps/lookup** — use when query strings are awkward (e.g. very long serials).',
  })
  @ApiBody({ type: SwapLookupDto })
  @ApiOkResponse({
    description: 'Serial matches the bike’s current battery',
    schema: {
      type: 'object',
      required: ['confirmed', 'bikeId', 'stationId', 'incomingBattery'],
      properties: {
        confirmed: { type: 'boolean', example: true },
        bikeId: { type: 'integer', example: 7 },
        stationId: { type: 'integer', example: 3 },
        incomingBattery: {
          type: 'object',
          description: 'Battery row including `station` and `bike` relations',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Empty serial, or serial does not match the battery mounted on the bike',
  })
  @ApiNotFoundResponse({ description: 'Unknown bike id, station id, or battery serial' })
  lookupIncomingBatteryPost(@Body() body: SwapLookupDto) {
    return this.assignmentService.lookupIncomingBattery(body);
  }

  @Post('assign')
  @RequirePermissions(PERMISSIONS.swaps.operate)
  @ApiOperation({
    summary: 'Start a swap by assigning a battery at a station',
    description:
      'Creates a swap transaction and assigns an available battery for the rider, bike, and station. When the bike still has a pack mounted, send **`incomingBatterySerialNumber`** (same value as **`GET /swaps/lookup`**).',
  })
  @ApiCreatedResponse({ description: 'Swap started with battery assignment' })
  @ApiBadRequestResponse({ description: 'Validation or business rule failure' })
  @ApiBody({ type: AssignBatteryDto })
  assignBattery(@Body() assignBatteryDto: AssignBatteryDto) {
    return this.assignmentService.assignBattery(assignBatteryDto);
  }

  @Post(':id/complete/:action')
  @RequirePermissions(PERMISSIONS.swaps.operate)
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
  @RequirePermissions(PERMISSIONS.swaps.read)
  @ApiOperation({ summary: 'List all swap transactions' })
  @ApiOkResponse({ description: 'All swaps' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<SwapTransaction[]> {
    return this.swapsService.findAll(this.readCtx(user));
  }

  /** Registered after GET swaps/lookup so `lookup` is not parsed as a numeric id. */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.swaps.read)
  @ApiOperation({ summary: 'Get swap transaction by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Swap record' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SwapTransaction> {
    return this.swapsService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.swaps.write)
  @ApiOperation({ summary: 'Create a swap transaction (manual / admin)' })
  @ApiCreatedResponse({ description: 'Created swap' })
  create(@Body() createSwapDto: CreateSwapDto): Promise<SwapTransaction> {
    return this.swapsService.create(createSwapDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.swaps.write)
  @ApiOperation({ summary: 'Update a swap transaction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated swap' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSwapDto: UpdateSwapDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SwapTransaction> {
    return this.swapsService.update(id, updateSwapDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.swaps.delete)
  @ApiOperation({ summary: 'Delete a swap transaction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted swap' })
  @ApiNotFoundResponse({ description: 'Swap not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<SwapTransaction> {
    return this.swapsService.remove(id, this.readCtx(user));
  }
}
