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
import type { Wallet } from '../prisma/types.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import { UpdateWalletDto } from './update-wallet.dto.js';
import { WalletsService } from './wallets.service.js';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'List all rider wallets' })
  @ApiOkResponse({ description: 'All wallets' })
  findAll(): Promise<Wallet[]> {
    return this.walletsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Wallet record' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Wallet> {
    return this.walletsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a wallet for a rider' })
  @ApiCreatedResponse({ description: 'Created wallet' })
  create(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return this.walletsService.create(createWalletDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wallet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated wallet' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<Wallet> {
    return this.walletsService.update(id, updateWalletDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wallet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted wallet' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Wallet> {
    return this.walletsService.remove(id);
  }
}
