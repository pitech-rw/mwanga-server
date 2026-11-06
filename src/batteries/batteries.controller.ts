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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { Battery } from '../prisma/types.js';
import { BatteriesService } from './batteries.service.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Batteries')
@Controller('batteries')
export class BatteriesController {
  constructor(private readonly batteriesService: BatteriesService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.batteries.read)
  @ApiOperation({ summary: 'List all batteries' })
  @ApiOkResponse({ description: 'All batteries' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.batteriesService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.batteries.read)
  @ApiOperation({ summary: 'Get battery by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Battery record' })
  @ApiNotFoundResponse({ description: 'Battery not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Battery> {
    return this.batteriesService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.batteries.write)
  @ApiOperation({ summary: 'Create a battery' })
  @ApiCreatedResponse({ description: 'Created battery' })
  create(@Body() createBatteryDto: CreateBatteryDto): Promise<Battery> {
    return this.batteriesService.create(createBatteryDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.batteries.write)
  @ApiOperation({ summary: 'Update a battery' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated battery' })
  @ApiNotFoundResponse({ description: 'Battery not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBatteryDto: UpdateBatteryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Battery> {
    return this.batteriesService.update(id, updateBatteryDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.batteries.delete)
  @ApiOperation({ summary: 'Delete a battery' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted battery' })
  @ApiNotFoundResponse({ description: 'Battery not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Battery> {
    return this.batteriesService.remove(id, this.readCtx(user));
  }
}
