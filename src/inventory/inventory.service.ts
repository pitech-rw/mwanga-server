import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { InventoryCodes } from '../errors/codes.js';
import { assertRiderBelongsToOwner } from '../fleet/fleet-rules.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { isUnrestrictedRead } from '../auth/read-scope.js';
import { BatteriesService } from '../batteries/batteries.service.js';
import { BikesService } from '../bikes/bikes.service.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type {
  Battery,
  Bike,
  InventoryItemKind,
  InventoryMovement,
} from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { ensureInventoryItem } from './inventory-lifecycle.js';
import { IssueInventoryBatteryBikeDto } from './issue-inventory-battery-bike.dto.js';
import { IssueInventoryBatteryStationDto } from './issue-inventory-battery-station.dto.js';
import { IssueInventoryBikeDto } from './issue-inventory-bike.dto.js';
import { ReceiveInventoryBatteryDto } from './receive-inventory-battery.dto.js';
import { ReceiveInventoryBikeDto } from './receive-inventory-bike.dto.js';
import { UpdateInventoryItemDto } from './update-inventory-item.dto.js';

export type InventoryItemDetail = {
  id: number;
  kind: InventoryItemKind;
  bikeId: number | null;
  batteryId: number | null;
  receivedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  bike: Bike | null;
  battery: Battery | null;
  movements: InventoryMovement[];
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bikesService: BikesService,
    private readonly batteriesService: BatteriesService,
  ) {}

  private assertInventoryRead(ctx: ReadScopeContext): void {
    if (!isUnrestrictedRead(ctx)) {
      throw new ForbiddenException('Insufficient scope to read inventory');
    }
  }

  private itemQuery() {
    return this.prisma.db.orm.public.InventoryItem.include('bike')
      .include('battery')
      .include('movements');
  }

  async findAll(ctx: ReadScopeContext, kind?: InventoryItemKind): Promise<InventoryItemDetail[]> {
    this.assertInventoryRead(ctx);
    const ordered = this.itemQuery().orderBy((row) => row.receivedAt.desc());
    if (kind) {
      return ordered.where({ kind }).all();
    }
    return ordered.all();
  }

  async findOne(id: number, ctx: ReadScopeContext): Promise<InventoryItemDetail> {
    this.assertInventoryRead(ctx);
    const item = await this.itemQuery().first({ id });
    if (!item) {
      throw new NotFoundException(`Inventory item with id ${id} not found`);
    }
    return item;
  }

  async listMovements(id: number, ctx: ReadScopeContext) {
    await this.findOne(id, ctx);
    return this.prisma.db.orm.public.InventoryMovement.where({ inventoryItemId: id })
      .orderBy((row) => row.createdAt.desc())
      .all();
  }

  async receiveBike(
    data: ReceiveInventoryBikeDto,
    actorUserId: number,
  ): Promise<InventoryItemDetail> {
    try {
      return await this.prisma.db.transaction(async (tx) => {
        const bike = await tx.orm.public.Bike.create({
          plateNumber: data.plateNumber,
          chassisNumber: data.chassisNumber,
          serialNumber: data.serialNumber,
          model: data.model,
          image: data.image,
          status: data.status ?? 'active',
          ownerId: null,
          userId: null,
          currentBatteryId: null,
        });

        await ensureInventoryItem(tx, 'bike', bike.id, {
          actorUserId,
          details: 'receive_bike',
        });

        if (data.notes) {
          await tx.orm.public.InventoryItem.where({ bikeId: bike.id }).update({
            notes: data.notes,
          });
        }

        const item = await tx.orm.public.InventoryItem.include('bike')
          .include('battery')
          .include('movements')
          .first({ bikeId: bike.id });

        if (!item) {
          throw new NotFoundException('Inventory record missing after receive');
        }

        return item;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(InventoryCodes.duplicateBike);
      }
      throw error;
    }
  }

  async receiveBattery(
    data: ReceiveInventoryBatteryDto,
    actorUserId: number,
  ): Promise<InventoryItemDetail> {
    const soc = data.soc ?? 100;
  const defaultStatus = data.status ?? ('offline' as const);

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const battery = await tx.orm.public.Battery.create({
          serialNumber: data.serialNumber,
          manufacturer: data.manufacturer,
          oem: data.oem,
          model: data.model,
          capacity: data.capacity,
          batteryType: data.batteryType ?? 'lithium',
          status: defaultStatus,
          soc,
          soh: data.soh ?? 100,
          cycleCount: data.cycleCount ?? 0,
          voltage: data.voltage,
          stationId: null,
        });

        await ensureInventoryItem(tx, 'battery', battery.id, {
          actorUserId,
          details: 'receive_battery',
        });

        if (data.notes) {
          await tx.orm.public.InventoryItem.where({ batteryId: battery.id }).update({
            notes: data.notes,
          });
        }

        const item = await tx.orm.public.InventoryItem.include('bike')
          .include('battery')
          .include('movements')
          .first({ batteryId: battery.id });

        if (!item) {
          throw new NotFoundException('Inventory record missing after receive');
        }

        return item;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(InventoryCodes.duplicateBattery);
      }
      throw error;
    }
  }

  async issueBike(id: number, data: IssueInventoryBikeDto, ctx: ReadScopeContext): Promise<Bike> {
    const item = await this.findOne(id, ctx);
    if (item.kind !== 'bike' || item.bikeId == null) {
      apiBadRequest(InventoryCodes.notBike);
    }

    const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
    if (!owner) {
      apiBadRequest(InventoryCodes.ownerNotFound, { params: { ownerId: data.ownerId } });
    }

    if (data.userId != null) {
      await assertRiderBelongsToOwner(this.prisma, data.userId, data.ownerId);
    }

    return this.bikesService.update(
      item.bikeId,
      {
        ownerId: data.ownerId,
        userId: data.userId,
      },
      ctx,
    );
  }

  async issueBatteryToStation(
    id: number,
    data: IssueInventoryBatteryStationDto,
    ctx: ReadScopeContext,
  ): Promise<Battery> {
    const item = await this.findOne(id, ctx);
    if (item.kind !== 'battery' || item.batteryId == null) {
      apiBadRequest(InventoryCodes.notBattery);
    }

    const station = await this.prisma.db.orm.public.Station.first({ id: data.stationId });
    if (!station) {
      apiBadRequest(InventoryCodes.stationNotFound, { params: { stationId: data.stationId } });
    }

    return this.batteriesService.update(item.batteryId, { stationId: data.stationId }, ctx);
  }

  async issueBatteryToBike(
    id: number,
    data: IssueInventoryBatteryBikeDto,
    ctx: ReadScopeContext,
  ): Promise<Battery> {
    const item = await this.findOne(id, ctx);
    if (item.kind !== 'battery' || item.batteryId == null) {
      apiBadRequest(InventoryCodes.notBattery);
    }

    return this.batteriesService.update(item.batteryId, { bikeId: data.bikeId }, ctx);
  }

  async returnBikeToStock(bikeId: number, ctx: ReadScopeContext): Promise<InventoryItemDetail> {
    await this.bikesService.update(
      bikeId,
      { ownerId: null, userId: null, currentBatteryId: null },
      ctx,
    );
    const item = await this.itemQuery().first({ bikeId });
    if (!item) {
      throw new NotFoundException(`No inventory record for bike ${bikeId} after return`);
    }
    return item;
  }

  async returnBatteryToStock(batteryId: number, ctx: ReadScopeContext): Promise<InventoryItemDetail> {
    await this.batteriesService.update(
      batteryId,
      { bikeId: null, stationId: null },
      ctx,
    );
    const item = await this.itemQuery().first({ batteryId });
    if (!item) {
      throw new NotFoundException(`No inventory record for battery ${batteryId} after return`);
    }
    return item;
  }

  async update(id: number, data: UpdateInventoryItemDto, ctx: ReadScopeContext): Promise<InventoryItemDetail> {
    await this.findOne(id, ctx);

    const item = await this.prisma.db.transaction(async (tx) => {
      const updated = await tx.orm.public.InventoryItem.include('bike')
        .include('battery')
        .include('movements')
        .where({ id })
        .update(withoutUndefined({ notes: data.notes }));

      if (!updated) {
        throw new NotFoundException(`Inventory item with id ${id} not found`);
      }

      if (data.notes !== undefined) {
        await tx.orm.public.InventoryMovement.create({
          inventoryItemId: id,
          kind: 'adjust',
          bikeId: updated.bikeId,
          batteryId: updated.batteryId,
          actorUserId: ctx.user.sub,
          details: 'notes_updated',
        });
      }

      return updated;
    });

    return item;
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<InventoryItemDetail> {
    const item = await this.findOne(id, ctx);

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.InventoryMovement.where({ inventoryItemId: id }).delete();
      await tx.orm.public.InventoryItem.where({ id }).delete();

      if (item.kind === 'bike' && item.bikeId != null) {
        await tx.orm.public.Bike.where({ id: item.bikeId }).delete();
      } else if (item.kind === 'battery' && item.batteryId != null) {
        await tx.orm.public.Battery.where({ id: item.batteryId }).delete();
      }
    });

    return item;
  }
}