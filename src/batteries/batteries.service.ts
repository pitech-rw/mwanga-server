import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { batteryReadFilter } from '../auth/read-scope.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Battery } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

type Tx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

@Injectable()
export class BatteriesService {
  constructor(private readonly prisma: PrismaService) {}

  private batteryQuery() {
    return this.prisma.db.orm.public.Battery.include('station').include('bike');
  }

  async findAll(ctx: ReadScopeContext) {
    const filter = batteryReadFilter(ctx);
    const ordered = this.batteryQuery().orderBy((battery) => battery.createdAt.desc());

    if (filter.unrestricted) {
      return ordered.all();
    }

    return ordered.where({ stationId: filter.stationId }).all();
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const battery = await this.batteryQuery().first({ id });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    const filter = batteryReadFilter(ctx);
    if (!filter.unrestricted && battery.stationId !== filter.stationId) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    return battery;
  }

  async create(data: CreateBatteryDto): Promise<Battery> {
    try {
      return await this.prisma.db.orm.public.Battery.include('station').include('bike').create({
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        oem: data.oem,
        model: data.model,
        batteryType: data.batteryType ?? 'lithium',
        status: data.status ?? 'available',
        soc: data.soc ?? 100,
        soh: data.soh ?? 100,
        cycleCount: data.cycleCount ?? 0,
        voltage: data.voltage,
        stationId: data.stationId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A battery with this serial number already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBatteryDto, ctx: ReadScopeContext): Promise<Battery> {
    await this.findOne(id, ctx);

    const bikePresent = data.bikeId !== undefined;
    const stationPresent = data.stationId !== undefined;
    const wantsBikeAttach = bikePresent && data.bikeId !== null;
    const wantsBikeDetach = bikePresent && data.bikeId === null;
    const wantsStation = stationPresent && data.stationId !== null;

    if (wantsBikeAttach && wantsStation) {
      throw new BadRequestException(
        'A battery cannot be attached to a bike and a station at the same time',
      );
    }

    const scalarPatch = withoutUndefined({
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      oem: data.oem,
      model: data.model,
      batteryType: data.batteryType,
      status: data.status,
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

      const battery = await this.prisma.db.orm.public.Battery.where({ id })
        .include('station')
        .include('bike')
        .update(scalarPatch);

      if (!battery) {
        throw new NotFoundException(`Battery with id ${id} not found`);
      }

      return battery;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A battery with this serial number already exists');
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
    await this.clearBatteryFromBikes(tx, batteryId);

    const battery = await tx.orm.public.Battery.where({ id: batteryId })
      .include('station')
      .include('bike')
      .update({
        ...scalarPatch,
        stationId,
      });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

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

    return battery;
  }

  private async applyAttachToBike(
    tx: Tx,
    batteryId: number,
    bikeId: number,
    scalarPatch: ReturnType<typeof withoutUndefined>,
  ): Promise<Battery> {
    const bike = await tx.orm.public.Bike.where({ id: bikeId }).first();

    if (!bike) {
      throw new NotFoundException(`Bike with id ${bikeId} not found`);
    }

    if (bike.currentBatteryId != null && bike.currentBatteryId !== batteryId) {
      throw new BadRequestException(
        'That bike already has a different battery installed. Remove it before assigning this pack.',
      );
    }

    await this.clearBatteryFromBikes(tx, batteryId);

    await tx.orm.public.Bike.where({ id: bikeId }).update({
      currentBatteryId: batteryId,
    });

    const battery = await tx.orm.public.Battery.where({ id: batteryId })
      .include('station')
      .include('bike')
      .update({
        ...scalarPatch,
        stationId: null,
      });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${batteryId} not found`);
    }

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
