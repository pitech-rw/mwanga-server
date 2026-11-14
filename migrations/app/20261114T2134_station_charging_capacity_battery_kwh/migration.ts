#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8dbd778de0907f9a80354420b110608b9ab61a5f644d7cd83def9dabbe05315b/contract';
import startContract from '../../snapshots/8dbd778de0907f9a80354420b110608b9ab61a5f644d7cd83def9dabbe05315b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/91d700a0b37098ef54f013b78164ad72ee97bd3d78543f7e4e8ebcc37b61da3d/contract';
import endContract from '../../snapshots/91d700a0b37098ef54f013b78164ad72ee97bd3d78543f7e4e8ebcc37b61da3d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameColumn({
        schema: 'public',
        table: 'Station',
        column: 'capacity',
        to: 'chargingCapacity',
      }),
      this.addColumn({
        schema: 'public',
        table: 'Battery',
        column: col('capacity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Station',
        column: col('model', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Station',
        column: col('photo', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Battery', column: 'model' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
