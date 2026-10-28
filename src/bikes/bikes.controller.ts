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
import { Bike } from '@prisma/client';
import { BikesService } from './bikes.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@Controller('bikes')
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  @Get()
  findAll(): Promise<Bike[]> {
    return this.bikesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Bike> {
    return this.bikesService.findOne(id);
  }

  @Post()
  create(@Body() createBikeDto: CreateBikeDto): Promise<Bike> {
    return this.bikesService.create(createBikeDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBikeDto: UpdateBikeDto,
  ): Promise<Bike> {
    return this.bikesService.update(id, updateBikeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Bike> {
    return this.bikesService.remove(id);
  }
}
