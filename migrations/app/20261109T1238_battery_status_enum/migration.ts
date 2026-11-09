#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2de91680cf49a794116112d151ee7fae5b3d64461f1dc13a3051dde7634f4581/contract';
import endContract from '../../snapshots/2de91680cf49a794116112d151ee7fae5b3d64461f1dc13a3051dde7634f4581/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e4963dfdb838382895ea3e8ea1f7b8bcab8165b9048315546429a53f3c7fd941/contract';
import startContract from '../../snapshots/e4963dfdb838382895ea3e8ea1f7b8bcab8165b9048315546429a53f3c7fd941/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.replaceStoredValue({
        schema: 'public',
        table: 'Battery',
        column: 'status',
        from: 'assigned',
        to: 'offline',
        codecRef: { codecId: 'pg/text@1' },
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Battery',
        constraint: 'Battery_status_check_d1516b84',
        expression: sql`"status" IN ('offline', 'available', 'charging', 'in_use', 'faulty')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
