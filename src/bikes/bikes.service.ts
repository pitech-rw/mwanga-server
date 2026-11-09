import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { bikeReadScope, denyOrNotFoundForScopedRead } from '../auth/read-scope.js';
import { assertRiderBelongsToOwner } from '../fleet/fleet-rules.js';
import { resolveFleetOwnerId } from '../fleet/resolve-fleet.js';
import { bikeIdsSeenAtStation } from '../auth/swapper-station-assets.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Bike } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@Injectable()
export class BikesService {
  constructor(private readonly prisma: PrismaService) {}

  private bikeQuery() {
    return this.prisma.db.orm.public.Bike.include('user')
      .include('owner')
      .include('currentBattery');
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = bikeReadScope(ctx);
    const ordered = this.bikeQuery().orderBy((bike) => bike.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    if (scope.mode === 'fleet') {
      const ownerId = await resolveFleetOwnerId(
        this.prisma,
        scope.actorUserId,
        scope.actorType,
      );
      return ordered.where({ ownerId }).all();
    }

    if (scope.mode === 'agent') {
      return ordered.where({ userId: scope.userId }).all();
    }

    const own = await this.bikeQuery().where({ userId: scope.userId }).all();
    const seenIds = await bikeIdsSeenAtStation(this.prisma, scope.stationId);
    const byId = new Map(own.map((bike) => [bike.id, bike]));

    for (const bikeId of seenIds) {
      if (!byId.has(bikeId)) {
        const row = await this.bikeQuery().first({ id: bikeId });
        if (row) {
          byId.set(bikeId, row);
        }
      }
    }

    return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const bike = await this.bikeQuery().first({ id });

    if (!bike) {
      throw new NotFoundException(`Bike with id ${id} not found`);
    }

    const scope = bikeReadScope(ctx);
    if (scope.mode === 'unrestricted') {
      return bike;
    }
    if (scope.mode === 'fleet') {
      const ownerId = await resolveFleetOwnerId(
        this.prisma,
        scope.actorUserId,
        scope.actorType,
      );
      if (bike.ownerId !== ownerId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
      return bike;
    }

    if (scope.mode === 'agent') {
      if (bike.userId !== scope.userId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
      return bike;
    }

    if (bike.userId === scope.userId) {
      return bike;
    }

    const seenIds = await bikeIdsSeenAtStation(this.prisma, scope.stationId);
    if (!seenIds.includes(bike.id)) {
      denyOrNotFoundForScopedRead(ctx, 'wrong_station');
    }
    return bike;
  }

  async create(data: CreateBikeDto): Promise<Bike> {
    const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
    if (!owner) {
      throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
    }

    if (data.userId != null) {
      await assertRiderBelongsToOwner(this.prisma, data.userId, data.ownerId);
    }

    try {
      return await this.bikeQuery().create({
        plateNumber: data.plateNumber,
        chassisNumber: data.chassisNumber,
        serialNumber: data.serialNumber,
        model: data.model,
        image: data.image,
        status: data.status ?? 'active',
        ownerId: data.ownerId,
        userId: data.userId,
        currentBatteryId: data.currentBatteryId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A bike with this plate number, chassis number, serial number, or current battery already exists',
        );
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBikeDto, ctx: ReadScopeContext): Promise<Bike> {
    const existing = await this.findOne(id, ctx);

  const nextOwnerId = data.ownerId ?? existing.ownerId;
    if (data.ownerId != null) {
      const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
      if (!owner) {
        throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
      }
    }

    const nextUserId = data.userId === undefined ? existing.userId : data.userId;
    if (nextUserId != null) {
      await assertRiderBelongsToOwner(this.prisma, nextUserId, nextOwnerId);
    }

    try {
      const bike = await this.bikeQuery()
        .where({ id })
        .update(
          withoutUndefined({
            plateNumber: data.plateNumber,
            chassisNumber: data.chassisNumber,
            serialNumber: data.serialNumber,
            model: data.model,
            image: data.image,
            status: data.status,
            ownerId: data.ownerId,
            // Allow null to unassign the rider (withoutUndefined strips undefined only).
            userId: data.userId === undefined ? undefined : data.userId,
            currentBatteryId: data.currentBatteryId,
          }),
        );

      if (!bike) {
        throw new NotFoundException(`Bike with id ${id} not found`);
      }

      return bike;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A bike with this plate number, chassis number, serial number, or current battery already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<Bike> {
    await this.findOne(id, ctx);

    const bike = await this.prisma.db.orm.public.Bike.where({ id }).delete();

    if (!bike) {
      throw new NotFoundException(`Bike with id ${id} not found`);
    }

    return bike;
  }
}
