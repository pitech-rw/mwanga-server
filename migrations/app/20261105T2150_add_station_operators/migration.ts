#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/845eee9a84e4cefaf95628063270ae7039fbf858daa2760a332c8653e9d09692/contract';
import endContract from '../../snapshots/845eee9a84e4cefaf95628063270ae7039fbf858daa2760a332c8653e9d09692/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dbaada04e4657d1d020911f2eb6b903d0677301f687ea8c25fd239e860f6ff4d/contract';
import startContract from '../../snapshots/dbaada04e4657d1d020911f2eb6b903d0677301f687ea8c25fd239e860f6ff4d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('stationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_stationId_idx_0626a60c',
        columns: ['stationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_stationId_fkey',
          columns: ['stationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
