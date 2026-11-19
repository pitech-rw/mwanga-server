#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0ea8e8c990d74e01c68ad2dfa9543594c49243f40b13bf1f10a5bf6b6ceaa1f5/contract';
import endContract from '../../snapshots/0ea8e8c990d74e01c68ad2dfa9543594c49243f40b13bf1f10a5bf6b6ceaa1f5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9570bf9ae95a535f3fbf64f5567b21c79bae7a926b6644a2c67b3d6844489ad4/contract';
import startContract from '../../snapshots/9570bf9ae95a535f3fbf64f5567b21c79bae7a926b6644a2c67b3d6844489ad4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Battery',
        constraint: 'Battery_status_check_d1516b84',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Battery',
        constraint: 'Battery_status_check_2185796a',
        expression: sql`"status" IN ('warehouse', 'offline', 'available', 'charging', 'in_use', 'faulty')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
