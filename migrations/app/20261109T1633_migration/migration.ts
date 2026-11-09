#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/78ed5f43229f35b6c2a1d880a129df0465e3a9eb25d6db2f296a10608590591f/contract';
import startContract from '../../snapshots/78ed5f43229f35b6c2a1d880a129df0465e3a9eb25d6db2f296a10608590591f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc48b6585d4c2d17ae4e244ccb2678839c02f862949b2d8cc2271b3eac50f4b2/contract';
import endContract from '../../snapshots/fc48b6585d4c2d17ae4e244ccb2678839c02f862949b2d8cc2271b3eac50f4b2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CompanyAccount',
        columns: [
          col('accountNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('balance', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('bankName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('CDF'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LedgerLine',
        columns: [
          col('amount', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('companyAccountId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revenueAccountId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('transactionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('walletId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LedgerLine_direction_check_6cfe4aa1',
            sql`"direction" IN ('debit', 'credit')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'LedgerTransaction',
        columns: [
          col('actorUserId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('externalReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idempotencyKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('swapTransactionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('walletId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LedgerTransaction_kind_check_6b381fe0',
            sql`"kind" IN ('float_topup', 'swap_fee', 'adjustment')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'RevenueAccount',
        columns: [
          col('balance', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('CDF'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Wallet',
        column: col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'CompanyAccount',
        constraint: 'CompanyAccount_accountNumber_key',
        columns: ['accountNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'LedgerTransaction',
        constraint: 'LedgerTransaction_externalReference_key',
        columns: ['externalReference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'LedgerTransaction',
        constraint: 'LedgerTransaction_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RevenueAccount',
        constraint: 'RevenueAccount_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_userId_key',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerLine',
        index: 'LedgerLine_companyAccountId_idx_56d6e937',
        columns: ['companyAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerLine',
        index: 'LedgerLine_revenueAccountId_idx_c391c524',
        columns: ['revenueAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerLine',
        index: 'LedgerLine_transactionId_idx_d3180832',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerLine',
        index: 'LedgerLine_walletId_idx_2e003173',
        columns: ['walletId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerTransaction',
        index: 'LedgerTransaction_actorUserId_idx_96dac96c',
        columns: ['actorUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerTransaction',
        index: 'LedgerTransaction_swapTransactionId_idx_64f4df5e',
        columns: ['swapTransactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerTransaction',
        index: 'LedgerTransaction_walletId_idx_2e003173',
        columns: ['walletId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerLine',
        foreignKey: {
          name: 'LedgerLine_transactionId_fkey',
          columns: ['transactionId'],
          references: { schema: 'public', table: 'LedgerTransaction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerLine',
        foreignKey: {
          name: 'LedgerLine_companyAccountId_fkey',
          columns: ['companyAccountId'],
          references: { schema: 'public', table: 'CompanyAccount', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerLine',
        foreignKey: {
          name: 'LedgerLine_walletId_fkey',
          columns: ['walletId'],
          references: { schema: 'public', table: 'Wallet', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerLine',
        foreignKey: {
          name: 'LedgerLine_revenueAccountId_fkey',
          columns: ['revenueAccountId'],
          references: { schema: 'public', table: 'RevenueAccount', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerTransaction',
        foreignKey: {
          name: 'LedgerTransaction_actorUserId_fkey',
          columns: ['actorUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerTransaction',
        foreignKey: {
          name: 'LedgerTransaction_walletId_fkey',
          columns: ['walletId'],
          references: { schema: 'public', table: 'Wallet', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerTransaction',
        foreignKey: {
          name: 'LedgerTransaction_swapTransactionId_fkey',
          columns: ['swapTransactionId'],
          references: { schema: 'public', table: 'SwapTransaction', columns: ['id'] },
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
