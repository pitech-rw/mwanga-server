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
import { Station } from '@prisma/client';
import { CreateStationDto } from './create-station.dto.js';
import { UpdateStationDto } from './update-station.dto.js';
import { StationsService } from './stations.service.js';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  findAll(): Promise<Station[]> {
    return this.stationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.findOne(id);
  }

  @Post()
  create(@Body() createStationDto: CreateStationDto): Promise<Station> {
    return this.stationsService.create(createStationDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStationDto: UpdateStationDto,
  ): Promise<Station> {
    return this.stationsService.update(id, updateStationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Station> {
    return this.stationsService.remove(id);
  }
}
