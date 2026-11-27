#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1d5646ca0022a42c25dad5364bbe6d8cb982b80757309cfe5309b51c630373c2/contract';
import startContract from '../../snapshots/1d5646ca0022a42c25dad5364bbe6d8cb982b80757309cfe5309b51c630373c2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/687828f38c41b25f5f6b2a6ab34940aaa7a240978f4c4b5e9af0fd43a9cc3f4a/contract';
import endContract from '../../snapshots/687828f38c41b25f5f6b2a6ab34940aaa7a240978f4c4b5e9af0fd43a9cc3f4a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
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
        table: 'AgentTopUpReceipt',
        columns: [
          col('actorUserId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('agentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('balanceAfter', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('balanceBefore', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('cashCollected', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('discountAmount', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('discountCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('document', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idempotencyKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ledgerTransactionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('locale', 'text', {
            notNull: true,
            default: lit('fr'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('pricingVersion', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receiptNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reprintCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('riderUserId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('taxAmount', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('taxRateBps', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('walletCredit', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('walletId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ReceiptSequence',
        columns: [
          col('id', 'int4', { notNull: true, default: lit(1), codecRef: { codecId: 'pg/int4@1' } }),
          col('lastValue', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('prefix', 'text', {
            notNull: true,
            default: lit('TU'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        constraint: 'AgentTopUpReceipt_receiptNumber_key',
        columns: ['receiptNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        constraint: 'AgentTopUpReceipt_ledgerTransactionId_key',
        columns: ['ledgerTransactionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        constraint: 'AgentTopUpReceipt_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        index: 'AgentTopUpReceipt_agentId_idx_8d0ba4f0',
        columns: ['agentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        index: 'AgentTopUpReceipt_riderUserId_idx_22e5177d',
        columns: ['riderUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        index: 'AgentTopUpReceipt_walletId_idx_2e003173',
        columns: ['walletId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        foreignKey: {
          name: 'AgentTopUpReceipt_ledgerTransactionId_fkey',
          columns: ['ledgerTransactionId'],
          references: { schema: 'public', table: 'LedgerTransaction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        foreignKey: {
          name: 'AgentTopUpReceipt_agentId_fkey',
          columns: ['agentId'],
          references: { schema: 'public', table: 'Agent', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        foreignKey: {
          name: 'AgentTopUpReceipt_riderUserId_fkey',
          columns: ['riderUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentTopUpReceipt',
        foreignKey: {
          name: 'AgentTopUpReceipt_walletId_fkey',
          columns: ['walletId'],
          references: { schema: 'public', table: 'Wallet', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
