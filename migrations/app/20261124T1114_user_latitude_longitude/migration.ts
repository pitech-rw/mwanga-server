#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1d5646ca0022a42c25dad5364bbe6d8cb982b80757309cfe5309b51c630373c2/contract';
import endContract from '../../snapshots/1d5646ca0022a42c25dad5364bbe6d8cb982b80757309cfe5309b51c630373c2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/816069f6a20078ad6b1fd7a256cb735ca8b816e4039b49fdb06f13488683c87b/contract';
import startContract from '../../snapshots/816069f6a20078ad6b1fd7a256cb735ca8b816e4039b49fdb06f13488683c87b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
