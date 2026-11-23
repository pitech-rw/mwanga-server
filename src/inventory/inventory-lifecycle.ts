import { apiBadRequest } from '../errors/api-error.js';
import { InventoryCodes } from '../errors/codes.js';
import type { PrismaService } from '../prisma.service.js';
import type { InventoryMovementKind } from '../prisma/types.js';

export type InventoryTx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

type BikeInventoryShape = {
  id: number;
  ownerId: number | null;
  userId: number | null;
  currentBatteryId: number | null;
};

type BatteryInventoryShape = {
  id: number;
  stationId: number | null;
};

export function bikeBelongsInInventory(bike: BikeInventoryShape): boolean {
  return (
    bike.ownerId == null &&
    bike.userId == null &&
    bike.currentBatteryId == null
  );
}

export async function batteryBelongsInInventory(
  tx: InventoryTx,
  battery: Pick<BatteryInventoryShape, 'id'>,
): Promise<boolean> {
  const pack = await tx.orm.public.Battery.first({ id: battery.id });
  if (!pack || pack.stationId != null) {
    return false;
  }
  const mounted = await tx.orm.public.Bike.where({ currentBatteryId: battery.id }).first();
  return mounted == null;
}

export function assertBikeWarehouseEligible(bike: Pick<BikeInventoryShape, 'currentBatteryId'>): void {
  if (bike.currentBatteryId != null) {
    apiBadRequest(InventoryCodes.warehouseBikeNoBattery);
  }
}

/** Bikes re-entering warehouse stock must be at a station (no rider, no pack, prior swap). */
export async function assertBikeMayReturnToWarehouse(
  tx: InventoryTx,
  bike: BikeInventoryShape & { id: number },
): Promise<void> {
  if (bike.userId != null) {
    apiBadRequest(InventoryCodes.bikeReturnRequiresStation);
  }
  if (bike.currentBatteryId != null) {
    apiBadRequest(InventoryCodes.warehouseBikeNoBattery);
  }

  const swap = await tx.orm.public.SwapTransaction.where({ bikeId: bike.id })
    .orderBy((row) => row.createdAt.desc())
    .first();

  if (!swap) {
    apiBadRequest(InventoryCodes.bikeReturnRequiresStation);
  }
}

export async function ensureInventoryItem(
  tx: InventoryTx,
  kind: 'bike' | 'battery',
  assetId: number,
  options?: { actorUserId?: number; details?: string },
): Promise<void> {
  const existing =
    kind === 'bike'
      ? await tx.orm.public.InventoryItem.first({ bikeId: assetId })
      : await tx.orm.public.InventoryItem.first({ batteryId: assetId });

  if (existing) {
    return;
  }

  const item = await tx.orm.public.InventoryItem.create({
    kind,
    bikeId: kind === 'bike' ? assetId : null,
    batteryId: kind === 'battery' ? assetId : null,
  });

  await tx.orm.public.InventoryMovement.create({
    inventoryItemId: item.id,
    kind: 'receive',
    bikeId: kind === 'bike' ? assetId : null,
    batteryId: kind === 'battery' ? assetId : null,
    actorUserId: options?.actorUserId,
    details: options?.details,
  });
}

export async function clearInventoryItem(
  tx: InventoryTx,
  kind: 'bike' | 'battery',
  assetId: number,
  movementKind: InventoryMovementKind,
  actorUserId?: number,
  details?: string,
): Promise<void> {
  const item =
    kind === 'bike'
      ? await tx.orm.public.InventoryItem.first({ bikeId: assetId })
      : await tx.orm.public.InventoryItem.first({ batteryId: assetId });

  if (!item) {
    return;
  }

  await tx.orm.public.InventoryMovement.create({
    inventoryItemId: item.id,
    kind: movementKind,
    bikeId: item.bikeId,
    batteryId: item.batteryId,
    actorUserId,
    details,
  });

  await tx.orm.public.InventoryItem.where({ id: item.id }).delete();
}

export async function syncBikeInventory(
  tx: InventoryTx,
  bike: BikeInventoryShape,
  actorUserId?: number,
): Promise<void> {
  if (bikeBelongsInInventory(bike)) {
    assertBikeWarehouseEligible(bike);
    await ensureInventoryItem(tx, 'bike', bike.id, { actorUserId });
    return;
  }

  const movementKind: InventoryMovementKind =
    bike.ownerId != null ? 'issue_to_owner' : 'adjust';
  await clearInventoryItem(tx, 'bike', bike.id, movementKind, actorUserId);
}

export async function syncBatteryInventory(
  tx: InventoryTx,
  battery: BatteryInventoryShape,
  actorUserId?: number,
): Promise<void> {
  if (await batteryBelongsInInventory(tx, battery)) {
    await ensureInventoryItem(tx, 'battery', battery.id, { actorUserId });
    return;
  }

  const mounted = await tx.orm.public.Bike.where({ currentBatteryId: battery.id }).first();
  const movementKind: InventoryMovementKind = mounted
    ? 'issue_to_bike'
    : 'issue_to_station';
  await clearInventoryItem(tx, 'battery', battery.id, movementKind, actorUserId);
}