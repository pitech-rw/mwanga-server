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
import { Rider } from '@prisma/client';
import { CreateRiderDto } from './create-rider.dto.js';
import { UpdateRiderDto } from './update-rider.dto.js';
import { RidersService } from './riders.service.js';

@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  findAll(): Promise<Rider[]> {
    return this.ridersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.findOne(id);
  }

  @Post()
  create(@Body() createRiderDto: CreateRiderDto): Promise<Rider> {
    return this.ridersService.create(createRiderDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRiderDto: UpdateRiderDto,
  ): Promise<Rider> {
    return this.ridersService.update(id, updateRiderDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.remove(id);
  }
}
