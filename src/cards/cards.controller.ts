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
import { NfcCard } from '@prisma/client';
import { CardsService } from './cards.service.js';
import { CreateCardDto } from './create-card.dto.js';
import { UpdateCardDto } from './update-card.dto.js';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  findAll(): Promise<NfcCard[]> {
    return this.cardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<NfcCard> {
    return this.cardsService.findOne(id);
  }

  @Post()
  create(@Body() createCardDto: CreateCardDto): Promise<NfcCard> {
    return this.cardsService.create(createCardDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardDto: UpdateCardDto,
  ): Promise<NfcCard> {
    return this.cardsService.update(id, updateCardDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<NfcCard> {
    return this.cardsService.remove(id);
  }
}
