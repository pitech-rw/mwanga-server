import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { NfcCard } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateCardDto } from './create-card.dto.js';
import { UpdateCardDto } from './update-card.dto.js';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  private cardQuery() {
    return this.prisma.db.orm.public.NfcCard.include('user');
  }

  async findAll() {
    return this.cardQuery().orderBy((card) => card.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const card = await this.cardQuery().first({ id });

    if (!card) {
      throw new NotFoundException(`NFC card with id ${id} not found`);
    }

    return card;
  }

  async create(data: CreateCardDto): Promise<NfcCard> {
    try {
      return await this.prisma.db.orm.public.NfcCard.include('user').create({
        token: data.token,
        serialNumber: data.serialNumber,
        type: data.type,
        status: data.status ?? 'active',
        userId: data.userId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An NFC card with this token or serial number already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateCardDto): Promise<NfcCard> {
    await this.findOne(id);

    try {
      const card = await this.prisma.db.orm.public.NfcCard.where({ id })
        .include('user')
        .update(
          withoutUndefined({
            token: data.token,
            serialNumber: data.serialNumber,
            type: data.type,
            status: data.status,
            userId: data.userId,
          }),
        );

      if (!card) {
        throw new NotFoundException(`NFC card with id ${id} not found`);
      }

      return card;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An NFC card with this token or serial number already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<NfcCard> {
    await this.findOne(id);

    const card = await this.prisma.db.orm.public.NfcCard.where({ id }).delete();

    if (!card) {
      throw new NotFoundException(`NFC card with id ${id} not found`);
    }

    return card;
  }
}
