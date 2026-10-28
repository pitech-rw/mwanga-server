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
import { Battery } from '@prisma/client';
import { BatteriesService } from './batteries.service.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

@Controller('batteries')
export class BatteriesController {
  constructor(private readonly batteriesService: BatteriesService) {}

  @Get()
  findAll(): Promise<Battery[]> {
    return this.batteriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Battery> {
    return this.batteriesService.findOne(id);
  }

  @Post()
  create(@Body() createBatteryDto: CreateBatteryDto): Promise<Battery> {
    return this.batteriesService.create(createBatteryDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBatteryDto: UpdateBatteryDto,
  ): Promise<Battery> {
    return this.batteriesService.update(id, updateBatteryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Battery> {
    return this.batteriesService.remove(id);
  }
}
