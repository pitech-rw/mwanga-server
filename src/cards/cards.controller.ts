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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { NfcCard } from '../prisma/types.js';
import { CardsService } from './cards.service.js';
import { CreateCardDto } from './create-card.dto.js';
import { UpdateCardDto } from './update-card.dto.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.cards.read)
  @ApiOperation({ summary: 'List all NFC cards' })
  @ApiOkResponse({ description: 'All cards' })
  findAll(): Promise<NfcCard[]> {
    return this.cardsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.cards.read)
  @ApiOperation({ summary: 'Get NFC card by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Card record' })
  @ApiNotFoundResponse({ description: 'Card not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<NfcCard> {
    return this.cardsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.cards.write)
  @ApiOperation({ summary: 'Register an NFC card' })
  @ApiCreatedResponse({ description: 'Created card' })
  create(@Body() createCardDto: CreateCardDto): Promise<NfcCard> {
    return this.cardsService.create(createCardDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.cards.write)
  @ApiOperation({ summary: 'Update an NFC card' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated card' })
  @ApiNotFoundResponse({ description: 'Card not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardDto: UpdateCardDto,
  ): Promise<NfcCard> {
    return this.cardsService.update(id, updateCardDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.cards.delete)
  @ApiOperation({ summary: 'Delete an NFC card' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted card' })
  @ApiNotFoundResponse({ description: 'Card not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<NfcCard> {
    return this.cardsService.remove(id);
  }
}
