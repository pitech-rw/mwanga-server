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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { Battery, Bike, InventoryItemKind } from '../prisma/types.js';
import type { InventoryItemDetail } from './inventory.service.js';
import { IssueInventoryBatteryBikeDto } from './issue-inventory-battery-bike.dto.js';
import { IssueInventoryBatteryStationDto } from './issue-inventory-battery-station.dto.js';
import { IssueInventoryBikeDto } from './issue-inventory-bike.dto.js';
import { InventoryService } from './inventory.service.js';
import { ReceiveInventoryBatteryDto } from './receive-inventory-battery.dto.js';
import { ReceiveInventoryBikeDto } from './receive-inventory-bike.dto.js';
import { UpdateInventoryItemDto } from './update-inventory-item.dto.js';

const INVENTORY_KINDS = ['bike', 'battery'] as const;

@ApiBearerAuth('JWT-auth')
@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.inventory.read)
  @ApiOperation({ summary: 'List warehouse inventory' })
  @ApiQuery({ name: 'kind', required: false, enum: INVENTORY_KINDS })
  @ApiOkResponse({ description: 'Inventory items in stock' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('kind') kind?: InventoryItemKind,
  ) {
    const normalized =
      kind && (INVENTORY_KINDS as readonly string[]).includes(kind) ? kind : undefined;
    return this.inventoryService.findAll(this.readCtx(user), normalized);
  }

  @Get(':id/movements')
  @RequirePermissions(PERMISSIONS.inventory.read)
  @ApiOperation({ summary: 'Movement history for an inventory item' })
  @ApiParam({ name: 'id', type: Number })
  listMovements(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.listMovements(id, this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.inventory.read)
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.findOne(id, this.readCtx(user));
  }

  @Post('receive/bike')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Receive a bike into warehouse stock' })
  @ApiCreatedResponse({ description: 'Created inventory record' })
  receiveBike(@Body() body: ReceiveInventoryBikeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.receiveBike(body, user.sub);
  }

  @Post('receive/battery')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Receive a battery into warehouse stock' })
  @ApiCreatedResponse({ description: 'Created inventory record' })
  receiveBattery(@Body() body: ReceiveInventoryBatteryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.receiveBattery(body, user.sub);
  }

  @Post(':id/issue/bike')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Issue a warehouse bike to a fleet owner' })
  @ApiParam({ name: 'id', type: Number })
  issueBike(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: IssueInventoryBikeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Bike> {
    return this.inventoryService.issueBike(id, body, this.readCtx(user));
  }

  @Post(':id/issue/battery/station')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Issue a warehouse battery to a station' })
  @ApiParam({ name: 'id', type: Number })
  issueBatteryStation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: IssueInventoryBatteryStationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Battery> {
    return this.inventoryService.issueBatteryToStation(id, body, this.readCtx(user));
  }

  @Post(':id/issue/battery/bike')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Issue a warehouse battery to a bike' })
  @ApiParam({ name: 'id', type: Number })
  issueBatteryBike(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: IssueInventoryBatteryBikeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Battery> {
    return this.inventoryService.issueBatteryToBike(id, body, this.readCtx(user));
  }

  @Post('return/bike/:bikeId')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Return a deployed bike to warehouse stock' })
  @ApiParam({ name: 'bikeId', type: Number })
  returnBike(
    @Param('bikeId', ParseIntPipe) bikeId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.returnBikeToStock(bikeId, this.readCtx(user));
  }

  @Post('return/battery/:batteryId')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Return a deployed battery to warehouse stock' })
  @ApiParam({ name: 'batteryId', type: Number })
  returnBattery(
    @Param('batteryId', ParseIntPipe) batteryId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.returnBatteryToStock(batteryId, this.readCtx(user));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.inventory.write)
  @ApiOperation({ summary: 'Update inventory metadata (notes)' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInventoryItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.update(id, body, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.inventory.delete)
  @ApiOperation({ summary: 'Remove intake record and linked asset' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.remove(id, this.readCtx(user));
  }
}