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
import { Owner } from '@prisma/client';
import { CreateOwnerDto } from './create-owner.dto.js';
import { UpdateOwnerDto } from './update-owner.dto.js';
import { OwnersService } from './owners.service.js';

@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  findAll(): Promise<Owner[]> {
    return this.ownersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Owner> {
    return this.ownersService.findOne(id);
  }

  @Post()
  create(@Body() createOwnerDto: CreateOwnerDto): Promise<Owner> {
    return this.ownersService.create(createOwnerDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOwnerDto: UpdateOwnerDto,
  ): Promise<Owner> {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<Owner> {
    return this.ownersService.remove(id);
  }
}
