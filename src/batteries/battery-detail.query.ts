import { db } from '../prisma/db.js';

/** Mirrors `BatteriesService` read includes; used to infer `BatteryDetail`. */
export function buildBatteryDetailQuery(client: typeof db) {
  return client.orm.public.Battery.include('station').include('bike', (bike) =>
    bike
      .include('user', (user) => user.include('riderWallet'))
      .include('owner', (owner) => owner.include('wallet')),
  );
}

export type BatteryDetailQuery = ReturnType<typeof buildBatteryDetailQuery>;
export type BatteryDetail = NonNullable<Awaited<ReturnType<BatteryDetailQuery['first']>>>;
