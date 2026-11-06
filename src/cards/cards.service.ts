import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { cardReadScope, denyOrNotFoundForScopedRead } from '../auth/read-scope.js';
import { cardIdsSeenAtStation } from '../auth/swapper-station-assets.js';
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

  async findAll(ctx: ReadScopeContext) {
    const scope = cardReadScope(ctx);
    const ordered = this.cardQuery().orderBy((card) => card.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    if (scope.mode === 'agent') {
      return ordered.where({ userId: scope.userId }).all();
    }

    const own = await this.cardQuery().where({ userId: scope.userId }).all();
    const seenIds = await cardIdsSeenAtStation(this.prisma, scope.stationId);
    const byId = new Map(own.map((c) => [c.id, c]));

    for (const cardId of seenIds) {
      if (!byId.has(cardId)) {
        const row = await this.cardQuery().first({ id: cardId });
        if (row) {
          byId.set(cardId, row);
        }
      }
    }

    return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const card = await this.cardQuery().first({ id });

    if (!card) {
      throw new NotFoundException(`NFC card with id ${id} not found`);
    }

    const scope = cardReadScope(ctx);
    if (scope.mode === 'unrestricted') {
      return card;
    }
    if (scope.mode === 'agent') {
      if (card.userId !== scope.userId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
      return card;
    }

    if (card.userId === scope.userId) {
      return card;
    }

    const seenIds = await cardIdsSeenAtStation(this.prisma, scope.stationId);
    if (!seenIds.includes(card.id)) {
      denyOrNotFoundForScopedRead(ctx, 'wrong_station');
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

  async update(id: number, data: UpdateCardDto, ctx: ReadScopeContext): Promise<NfcCard> {
    await this.findOne(id, ctx);

    try {
      const card = await this.prisma.db.orm.public.NfcCard.where({ id })
        .include('user')
        .update(
          withoutUndefined({
            token: data.token,
            serialNumber: data.serialNumber,
            type: data.type,
            status: data.status,
            // Allow null to unassign the rider (withoutUndefined strips undefined only).
            userId: data.userId === undefined ? undefined : data.userId,
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

  async remove(id: number, ctx: ReadScopeContext): Promise<NfcCard> {
    await this.findOne(id, ctx);

    const card = await this.prisma.db.orm.public.NfcCard.where({ id }).delete();

    if (!card) {
      throw new NotFoundException(`NFC card with id ${id} not found`);
    }

    return card;
  }
}
