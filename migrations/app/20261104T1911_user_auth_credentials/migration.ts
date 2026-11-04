#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c926b7fcc80c17523d8668473e654350526a31ea617d29339754fac029e5b9e7/contract';
import startContract from '../../snapshots/c926b7fcc80c17523d8668473e654350526a31ea617d29339754fac029e5b9e7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/caa06bdabf57f32eefc0621c43cf15bfab619b671f2b3eadaa89937854dd3a20/contract';
import endContract from '../../snapshots/caa06bdabf57f32eefc0621c43cf15bfab619b671f2b3eadaa89937854dd3a20/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('lastLoginAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
