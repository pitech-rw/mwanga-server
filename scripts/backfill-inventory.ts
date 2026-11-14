import { db } from '../src/prisma/db.js';

async function main() {
  const warehouseBikes = await db.orm.public.Bike.where({ ownerId: null, userId: null }).all();
  for (const bike of warehouseBikes) {
    if (bike.currentBatteryId != null) {
      continue;
    }
    const existing = await db.orm.public.InventoryItem.first({ bikeId: bike.id });
    if (existing) {
      continue;
    }
    const item = await db.orm.public.InventoryItem.create({ kind: 'bike', bikeId: bike.id });
    await db.orm.public.InventoryMovement.create({
      inventoryItemId: item.id,
      kind: 'receive',
      details: 'backfill',
    });
  }

  const batteries = await db.orm.public.Battery.where({ stationId: null }).all();
  for (const battery of batteries) {
    const mounted = await db.orm.public.Bike.where({ currentBatteryId: battery.id }).first();
    if (mounted) {
      continue;
    }
    const existing = await db.orm.public.InventoryItem.first({ batteryId: battery.id });
    if (existing) {
      continue;
    }
    const item = await db.orm.public.InventoryItem.create({ kind: 'battery', batteryId: battery.id });
    await db.orm.public.InventoryMovement.create({
      inventoryItemId: item.id,
      kind: 'receive',
      details: 'backfill',
    });
  }
}

main()
  .then(() => {
    console.log('Inventory backfill complete.');
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });