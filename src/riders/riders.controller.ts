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
import type { Rider } from '../prisma/types.js';
import { CreateRiderDto } from './create-rider.dto.js';
import { UpdateRiderDto } from './update-rider.dto.js';
import { RidersService } from './riders.service.js';

@ApiTags('Riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all riders' })
  @ApiOkResponse({ description: 'All riders' })
  findAll(): Promise<Rider[]> {
    return this.ridersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rider by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Rider record' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a rider' })
  @ApiCreatedResponse({ description: 'Created rider' })
  create(@Body() createRiderDto: CreateRiderDto): Promise<Rider> {
    return this.ridersService.create(createRiderDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rider' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated rider' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRiderDto: UpdateRiderDto,
  ): Promise<Rider> {
    return this.ridersService.update(id, updateRiderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rider' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted rider' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.remove(id);
  }
}
