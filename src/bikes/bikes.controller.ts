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
import type { Bike } from '../prisma/types.js';
import { BikesService } from './bikes.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@ApiTags('Bikes')
@Controller('bikes')
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  @Get()
  @ApiOperation({ summary: 'List all bikes' })
  @ApiOkResponse({ description: 'All bikes' })
  findAll(): Promise<Bike[]> {
    return this.bikesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bike by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Bike record' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Bike> {
    return this.bikesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bike' })
  @ApiCreatedResponse({ description: 'Created bike' })
  create(@Body() createBikeDto: CreateBikeDto): Promise<Bike> {
    return this.bikesService.create(createBikeDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bike' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated bike' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBikeDto: UpdateBikeDto,
  ): Promise<Bike> {
    return this.bikesService.update(id, updateBikeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bike' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted bike' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Bike> {
    return this.bikesService.remove(id);
  }
}
