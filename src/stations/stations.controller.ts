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
import type { Station } from '../prisma/types.js';
import { CreateStationDto } from './create-station.dto.js';
import { UpdateStationDto } from './update-station.dto.js';
import { StationsService } from './stations.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'List all swap stations' })
  @ApiOkResponse({ description: 'All stations' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Station[]> {
    return this.stationsService.findAll(this.readCtx(user));
  }

  @Get('next-code')
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'Preview the next auto-assigned station code' })
  @ApiOkResponse({ description: 'Next station code (assigned again on create)' })
  previewNextCode(@CurrentUser() user: AuthenticatedUser): Promise<{ code: string }> {
    return this.stationsService.previewNextCode(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'Get station by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Station record' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Station> {
    return this.stationsService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.stations.write)
  @ApiOperation({ summary: 'Create a swap station' })
  @ApiCreatedResponse({ description: 'Created station' })
  create(@Body() createStationDto: CreateStationDto): Promise<Station> {
    return this.stationsService.create(createStationDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.stations.write)
  @ApiOperation({ summary: 'Update a swap station' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated station' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStationDto: UpdateStationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Station> {
    return this.stationsService.update(id, updateStationDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.stations.delete)
  @ApiOperation({ summary: 'Delete a swap station' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted station' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Station> {
    return this.stationsService.remove(id, this.readCtx(user));
  }
}
