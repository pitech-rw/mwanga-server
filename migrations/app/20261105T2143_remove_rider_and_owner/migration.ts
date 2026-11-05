#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract';
import startContract from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dbaada04e4657d1d020911f2eb6b903d0677301f687ea8c25fd239e860f6ff4d/contract';
import endContract from '../../snapshots/dbaada04e4657d1d020911f2eb6b903d0677301f687ea8c25fd239e860f6ff4d/contract.json' with { type: 'json' };
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
        constraint: 'Bike_ownerId_fkey',
        kind: 'foreignKey',
      }),
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
      this.dropIndex({ schema: 'public', table: 'Bike', index: 'Bike_ownerId_idx_e2d0c1ef' }),
      this.dropColumn({ schema: 'public', table: 'Bike', column: 'ownerId' }),
      this.dropTable({ schema: 'public', table: 'Rider' }),
      this.dropTable({ schema: 'public', table: 'Owner' }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('kycStatus', 'text', {
          notNull: true,
          default: lit('pending'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Station', column: 'createdAt' }),
      this.dropNotNull({ schema: 'public', table: 'Station', column: 'updatedAt' }),
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
