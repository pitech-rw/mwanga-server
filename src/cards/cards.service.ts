import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NfcCard, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateCardDto } from './create-card.dto.js';
import { UpdateCardDto } from './update-card.dto.js';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<NfcCard[]> {
    return this.prisma.nfcCard.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rider: true },
    });
  }

  async findOne(id: number): Promise<NfcCard> {
    const card = await this.prisma.nfcCard.findUnique({
      where: { id },
      include: { rider: true },
    });

    if (!card) {
      throw new NotFoundException(`NFC card with id ${id} not found`);
    }

    return card;
  }

  async create(data: CreateCardDto): Promise<NfcCard> {
    const cardData: Prisma.NfcCardCreateInput = {
      token: data.token,
      status: data.status ?? 'active',
      rider: data.riderId ? { connect: { id: data.riderId } } : undefined,
    };

    try {
      return await this.prisma.nfcCard.create({
        data: cardData,
        include: { rider: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('An NFC card with this token already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateCardDto): Promise<NfcCard> {
    await this.findOne(id);

    const updateData: Prisma.NfcCardUpdateInput = {
      token: data.token,
      status: data.status,
      rider: data.riderId !== undefined ? { connect: { id: data.riderId } } : undefined,
    };

    try {
      return await this.prisma.nfcCard.update({
        where: { id },
        data: updateData,
        include: { rider: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('An NFC card with this token already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<NfcCard> {
    await this.findOne(id);

    return this.prisma.nfcCard.delete({ where: { id } });
  }
}
