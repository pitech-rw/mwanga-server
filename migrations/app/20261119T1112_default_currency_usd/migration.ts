#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0f5451dd2a46d1997c07c95a46bc8b98e7fdb54b968f6ea65dccbbdbb8ae79be/contract';
import startContract from '../../snapshots/0f5451dd2a46d1997c07c95a46bc8b98e7fdb54b968f6ea65dccbbdbb8ae79be/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9570bf9ae95a535f3fbf64f5567b21c79bae7a926b6644a2c67b3d6844489ad4/contract';
import endContract from '../../snapshots/9570bf9ae95a535f3fbf64f5567b21c79bae7a926b6644a2c67b3d6844489ad4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'User', column: 'kycStatus' }),
      this.setDefault({
        schema: 'public',
        table: 'CompanyAccount',
        column: col('currency', 'text', {
          default: lit('USD'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'RevenueAccount',
        column: col('currency', 'text', {
          default: lit('USD'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'Wallet',
        column: col('currency', 'text', {
          default: lit('USD'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
