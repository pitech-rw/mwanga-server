#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/845eee9a84e4cefaf95628063270ae7039fbf858daa2760a332c8653e9d09692/contract';
import startContract from '../../snapshots/845eee9a84e4cefaf95628063270ae7039fbf858daa2760a332c8653e9d09692/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e4963dfdb838382895ea3e8ea1f7b8bcab8165b9048315546429a53f3c7fd941/contract';
import endContract from '../../snapshots/e4963dfdb838382895ea3e8ea1f7b8bcab8165b9048315546429a53f3c7fd941/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Station',
        column: col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
