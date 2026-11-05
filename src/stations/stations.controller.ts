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

  @Get()
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'List all swap stations' })
  @ApiOkResponse({ description: 'All stations' })
  findAll(): Promise<Station[]> {
    return this.stationsService.findAll();
  }

  @Get('next-code')
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'Preview the next auto-assigned station code' })
  @ApiOkResponse({ description: 'Next station code (assigned again on create)' })
  previewNextCode(): Promise<{ code: string }> {
    return this.stationsService.previewNextCode();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.stations.read)
  @ApiOperation({ summary: 'Get station by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Station record' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.findOne(id);
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
  ): Promise<Station> {
    return this.stationsService.update(id, updateStationDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.stations.delete)
  @ApiOperation({ summary: 'Delete a swap station' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted station' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.remove(id);
  }
}
