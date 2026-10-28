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
import { SwapTransaction } from '@prisma/client';
import { CreateSwapDto } from './create-swap.dto.js';
import { UpdateSwapDto } from './update-swap.dto.js';
import { SwapsService } from './swaps.service.js';

@Controller('swaps')
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Get()
  findAll(): Promise<SwapTransaction[]> {
    return this.swapsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.findOne(id);
  }

  @Post()
  create(@Body() createSwapDto: CreateSwapDto): Promise<SwapTransaction> {
    return this.swapsService.create(createSwapDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSwapDto: UpdateSwapDto,
  ): Promise<SwapTransaction> {
    return this.swapsService.update(id, updateSwapDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<SwapTransaction> {
    return this.swapsService.remove(id);
  }
}
