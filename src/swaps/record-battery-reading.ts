import type { PrismaService } from '../prisma.service.js';
import type { ReadingDirection } from '../prisma/types.js';

type Tx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

export async function recordBatteryReading(
  client: Tx,
  swapTransactionId: number,
  batteryId: number | null | undefined,
  direction: ReadingDirection,
) {
  if (batteryId == null) {
    return;
  }

  const battery = await client.orm.public.Battery.first({ id: batteryId });

  if (!battery) {
    return;
  }

  const existing = await client.orm.public.BatteryReading.where({
    swapTransactionId,
    direction,
  }).first();

  if (existing?.batteryId === battery.id) {
    return;
  }

  const snapshot = {
    batteryId: battery.id,
    soc: battery.soc,
    soh: battery.soh,
    voltage: battery.voltage,
    cycleCount: battery.cycleCount,
  };

  if (existing) {
    await client.orm.public.BatteryReading.where({ id: existing.id }).update(snapshot);
    return;
  }

  await client.orm.public.BatteryReading.create({
    swapTransactionId,
    direction,
    ...snapshot,
  });
}
