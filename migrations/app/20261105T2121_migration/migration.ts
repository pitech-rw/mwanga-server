#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4d309f1c3e7b717bde9f7648c8d77ae7779916eb145f8e188d978bc485fdb7de/contract';
import endContract from '../../snapshots/4d309f1c3e7b717bde9f7648c8d77ae7779916eb145f8e188d978bc485fdb7de/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract';
import startContract from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameColumn({ schema: 'public', table: 'Bike', column: 'riderId', to: 'userId' }),
      ...this.renameColumn({ schema: 'public', table: 'NfcCard', column: 'riderId', to: 'userId' }),
      ...this.renameColumn({
        schema: 'public',
        table: 'SwapTransaction',
        column: 'riderId',
        to: 'userId',
      }),
      ...this.renameColumn({ schema: 'public', table: 'Wallet', column: 'riderId', to: 'userId' }),
      this.dropConstraint({
        schema: 'public',
        table: 'Bike',
        constraint: 'Bike_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'NfcCard',
        constraint: 'NfcCard_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'SwapTransaction',
        constraint: 'SwapTransaction_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropTable({ schema: 'public', table: 'Rider' }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('kycStatus', 'text', {
          notNull: true,
          default: lit('pending'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Station', column: 'createdAt' }),
      this.dropNotNull({ schema: 'public', table: 'Station', column: 'updatedAt' }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Bike',
        foreignKey: {
          name: 'Bike_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NfcCard',
        foreignKey: {
          name: 'NfcCard_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'Owner', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Wallet',
        foreignKey: {
          name: 'Wallet_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
