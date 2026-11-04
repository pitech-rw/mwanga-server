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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Station } from '../prisma/types.js';
import { CreateStationDto } from './create-station.dto.js';
import { UpdateStationDto } from './update-station.dto.js';
import { StationsService } from './stations.service.js';

@ApiTags('Stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all swap stations' })
  @ApiOkResponse({ description: 'All stations' })
  findAll(): Promise<Station[]> {
    return this.stationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Station record' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a swap station' })
  @ApiCreatedResponse({ description: 'Created station' })
  create(@Body() createStationDto: CreateStationDto): Promise<Station> {
    return this.stationsService.create(createStationDto);
  }

  @Patch(':id')
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
  @ApiOperation({ summary: 'Delete a swap station' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted station' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.remove(id);
  }
}
