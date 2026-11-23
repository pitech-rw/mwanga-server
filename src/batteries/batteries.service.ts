import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { BatteriesCodes } from '../errors/codes.js';
import { bikeIdsSeenAtStation } from '../auth/swapper-station-assets.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { batteryReadFilter, isUnrestrictedRead } from '../auth/read-scope.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Battery } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import {
  buildBatteryDetailQuery,
  type BatteryDetail,
} from './battery-detail.query.js';
import { batteryStatusAtStation } from './battery-status.js';
import {
  batteryBelongsInInventory,
  syncBatteryInventory,
  syncBikeInventory,
} from '../inventory/inventory-lifecycle.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

type Tx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

@Injectable()
export class BatteriesService {
  constructor(private readonly prisma: PrismaService) {}

  private batteryQuery() {
    return buildBatteryDetailQuery(this.prisma.db);
  }

  /** Prefer rider wallet; fall back to fleet owner wallet on `bike.wallet`. */
  private withBikeWallet<T extends BatteryDetail>(battery: T): T {
    const bike = battery.bike;
    if (!bike) {
      return battery;
    }
    Object.assign(bike, {
      wallet: bike.user?.riderWallet ?? bike.owner?.wallet ?? null,
    });
    return battery;
  }

  /**
   * Swapper may read packs at their station, packs **in_use** (any station), or packs on a bike
   * they may read (aligned with bike list scope).
   */
  private notFoundForBattery(battery: Battery): NotFoundException {
    return new NotFoundException(
      `No battery found with serial number "${battery.serialNumber}"`,
    );
  }

  private async assertCanReadBattery(battery: Battery, ctx: ReadScopeContext): Promise<void> {
    if (isUnrestrictedRead(ctx)) {
      return;
    }
    if (ctx.user.type !== 'swapper') {
      throw new ForbiddenException('Insufficient scope to read batteries');
    }
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    if (battery.status === 'in_use') {
      return;
    }
    if (battery.stationId === ctx.user.stationId) {
      return;
    }
    const bike =
      (await this.prisma.db.orm.public.Bike.where({ currentBatteryId: battery.id })
        .include('user')
        .first()) ?? null;
    if (!bike) {
      // Serial exists but pack is not at this station and not mounted on a bike (or visibility rules hide it).
      throw this.notFoundForBattery(battery);
    }
    if (bike.userId === ctx.user.sub) {
      return;
    }
    const seenIds = await bikeIdsSeenAtStation(this.prisma, ctx.user.stationId);
    if (seenIds.includes(bike.id)) {
      return;
    }
    throw this.notFoundForBattery(battery);
  }

  async findAll(ctx: ReadScopeContext): Promise<BatteryDetail[]> {
    const filter = batteryReadFilter(ctx);
    const ordered = this.batteryQuery().orderBy((battery) => battery.createdAt.desc());

    const rows = filter.unrestricted
      ? await ordered.all()
      : await ordered.where({ stationId: filter.stationId }).all();

    return rows.map((row) => this.withBikeWallet(row));
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const battery = await this.batteryQuery().first({ id });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    try {
      await this.assertCanReadBattery(battery, ctx);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new NotFoundException(`Battery with id ${id} not found`);
      }
      throw err;
    }

    return this.withBikeWallet(battery);
  }

  async findOneBySerial(serialNumber: string, ctx: ReadScopeContext): Promise<BatteryDetail> {
    const normalized = serialNumber.trim();
    if (normalized === '') {
      apiBadRequest(BatteriesCodes.serialQueryRequired);
    }

    // Confirm caller may use battery reads (swapper station / role gate)
    batteryReadFilter(ctx);

    const battery = await this.batteryQuery().first({ serialNumber: normalized });

    if (!battery) {
      throw new NotFoundException('No battery found with this serial number');
    }

    await this.assertCanReadBattery(battery, ctx);

    return this.withBikeWallet(battery);
  }

  async create(data: CreateBatteryDto): Promise<Battery> {
    if (data.stationId != null) {
      apiBadRequest(BatteriesCodes.stationRequiresInventory);
    }

    const soc = data.soc ?? 100;
    const defaultStatus = 'warehouse' as const;

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const battery = await tx.orm.public.Battery.include('station').include('bike').create({
          serialNumber: data.serialNumber,
          manufacturer: data.manufacturer,
          oem: data.oem,
          model: data.model,
          capacity: data.capacity,
          batteryType: data.batteryType ?? 'lithium',
          status: data.status ?? defaultStatus,
          soc,
          soh: data.soh ?? 100,
          cycleCount: data.cycleCount ?? 0,
          voltage: data.voltage,
          stationId: data.stationId,
        });

        await syncBatteryInventory(tx, battery);
        return battery;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(BatteriesCodes.duplicateSerial);
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBatteryDto, ctx: ReadScopeContext): Promise<Battery> {
    const existing = await this.findOne(id, ctx);

    const bikePresent = data.bikeId !== undefined;
    const stationPresent = data.stationId !== undefined;
    const wantsBikeAttach = bikePresent && data.bikeId !== null;
    const wantsBikeDetach = bikePresent && data.bikeId === null;
    const wantsStation = stationPresent && data.stationId !== null;

    if (wantsBikeAttach && wantsStation) {
      apiBadRequest(BatteriesCodes.bikeAndStation);
    }

    const stationIdAfterPatch =
      data.stationId !== undefined ? data.stationId : existing.stationId;

    const scalarPatch = withoutUndefined({
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      oem: data.oem,
      model: data.model,
      capacity: data.capacity,
      batteryType: data.batteryType,
      status:
        data.status ??
        (data.soc !== undefined &&
        stationIdAfterPatch != null &&
        existing.status !== 'in_use' &&
        existing.status !== 'faulty' &&
        existing.status !== 'offline' &&
        existing.status !== 'warehouse'
          ? batteryStatusAtStation(data.soc)
          : undefined),
      soc: data.soc,
      soh: data.soh,
      cycleCount: data.cycleCount,
      voltage: data.voltage,
    });

    try {
      if (wantsBikeAttach) {
        return await this.prisma.db.transaction(async (tx) =>
          this.applyAttachToBike(tx, id, data.bikeId as number, scalarPatch),
        );
      }

      if (wantsBikeDetach) {
        return await this.prisma.db.transaction(async (tx) =>
          this.applyDetachFromBike(tx, id, scalarPatch),
        );
      }

      if (stationPresent) {
        return await this.prisma.db.transaction(async (tx) =>
          this.applyAttachToStation(tx, id, data.stationId ?? null, scalarPatch),
        );
      }

      const battery = await this.prisma.db.transaction(async (tx) => {
        const updated = await tx.orm.public.Battery.where({ id })
          .include('station')
          .include('bike')
          .update(scalarPatch);

        if (!updated) {
          throw new NotFoundException(`Battery with id ${id} not found`);
        }

        await syncBatteryInventory(tx, updated);
        return updated;
      });

      return battery;
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(BatteriesCodes.duplicateSerial);
      }

      throw error;
    }
  }

  private async clearBatteryFromBikes(tx: Tx, batteryId: number): Promise<void> {
    const bikes = await tx.orm.public.Bike.where({
      currentBatteryId: batteryId,
    }).all();

    for (const bike of bikes) {
      await tx.orm.public.Bike.where({ id: bike.id }).update({
        currentBatteryId: null,
      });
    }
  }

  private async applyAttachToStation(
    tx: Tx,
    batteryId: number,
    stationId: number | null,
    scalarPatch: ReturnType<typeof withoutUndefined>,
  ): Promise<Battery> {
    if (stationId != null) {
      const mounted = await tx.orm.public.Bike.where({ currentBatteryId: batteryId }).first();
      if (mounted) {
        apiBadRequest(BatteriesCodes.bikeViaSwapOnly);
      }

      const pack = await tx.orm.public.Battery.first({ id: batteryId });
      if (
        pack == null ||
        !(await batteryBelongsInInventory(tx, { id: batteryId, stationId: pack.stationId }))
      ) {
        apiBadRequest(BatteriesCodes.stationRequiresInventory);
      }
    } else {
      await this.clearBatteryFromBikes(tx, batteryId);
    }

    const existing = await tx.orm.public.Battery.first({ id: batteryId });
    const soc =
      (scalarPatch.soc as number | undefined) ?? existing?.soc ?? 100;
    const statusPatch =
      stationId != null ? { status: batteryStatusAtStation(soc) } : {};

    const battery = await tx.orm.public.Battery.where({ id: batteryId })
      .include('station')
      .include('bike')
      .update({
        ...scalarPatch,
        ...statusPatch,
        stationId,
      });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

    await syncBatteryInventory(tx, battery);
    return battery;
  }

  private async applyDetachFromBike(
    tx: Tx,
    batteryId: number,
    scalarPatch: ReturnType<typeof withoutUndefined>,
  ): Promise<Battery> {
    const holdingBike = await tx.orm.public.Bike.where({
      currentBatteryId: batteryId,
    }).first();

    if (holdingBike) {
      await tx.orm.public.Bike.where({ id: holdingBike.id }).update({
        currentBatteryId: null,
      });
    }

    const battery = await tx.orm.public.Battery.where({ id: batteryId })
      .include('station')
      .include('bike')
      .update(scalarPatch);

    if (!battery) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

    await syncBatteryInventory(tx, battery);
    return battery;
  }

  private async applyAttachToBike(
    tx: Tx,
    batteryId: number,
    bikeId: number,
    scalarPatch: ReturnType<typeof withoutUndefined>,
  ): Promise<Battery> {
    const pack = await tx.orm.public.Battery.first({ id: batteryId });
    if (!pack) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

    const bike = await tx.orm.public.Bike.first({ id: bikeId });
    if (!bike) {
      throw new NotFoundException(`Bike with id ${bikeId} not found`);
    }

    if (bike.ownerId == null) {
      apiBadRequest(BatteriesCodes.warehouseBikeInstall);
    }

    if (bike.currentBatteryId != null && bike.currentBatteryId !== batteryId) {
      apiBadRequest(BatteriesCodes.bikeHasDifferentBattery);
    }

    const completedSwap = await tx.orm.public.SwapTransaction.where({
      bikeId,
      status: 'completed',
    }).first();
    if (completedSwap) {
      apiBadRequest(BatteriesCodes.bikeViaSwapOnly);
    }

    if (pack.stationId != null) {
      apiBadRequest(BatteriesCodes.bikeViaSwapOnly);
    }

    const mountedElsewhere = await tx.orm.public.Bike.where({
      currentBatteryId: batteryId,
    }).first();
    if (mountedElsewhere && mountedElsewhere.id !== bikeId) {
      apiBadRequest(BatteriesCodes.bikeHasDifferentBattery);
    }

    const alreadyOnBike = mountedElsewhere?.id === bikeId;
    if (!alreadyOnBike) {
      if (!(await batteryBelongsInInventory(tx, { id: batteryId, stationId: pack.stationId }))) {
        apiBadRequest(BatteriesCodes.bikeViaSwapOnly);
      }
    }

    await this.clearBatteryFromBikes(tx, batteryId);
    await tx.orm.public.Bike.where({ id: bikeId }).update({ currentBatteryId: batteryId });

    const battery = await tx.orm.public.Battery.where({ id: batteryId })
      .include('station')
      .include('bike')
      .update({
        ...scalarPatch,
        stationId: null,
        status: 'in_use',
      });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

    await syncBatteryInventory(tx, battery);
    return battery;
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<Battery> {
    await this.findOne(id, ctx);

    const battery = await this.prisma.db.orm.public.Battery.where({ id }).delete();

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    return battery;
  }
}
