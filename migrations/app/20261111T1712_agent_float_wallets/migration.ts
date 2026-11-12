#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8dbd778de0907f9a80354420b110608b9ab61a5f644d7cd83def9dabbe05315b/contract';
import endContract from '../../snapshots/8dbd778de0907f9a80354420b110608b9ab61a5f644d7cd83def9dabbe05315b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc48b6585d4c2d17ae4e244ccb2678839c02f862949b2d8cc2271b3eac50f4b2/contract';
import startContract from '../../snapshots/fc48b6585d4c2d17ae4e244ccb2678839c02f862949b2d8cc2271b3eac50f4b2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'LedgerTransaction',
        constraint: 'LedgerTransaction_kind_check_6b381fe0',
      }),
      this.createTable({
        schema: 'public',
        table: 'Agent',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Wallet',
        column: col('agentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Wallet', column: 'ownerId' }),
      rawSql({
        id: 'data_migration.backfill_rider_wallets',
        label: 'Give each rider a personal wallet',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'Wallet' } },
        precheck: [],
        postcheck: [],
        execute: [
          {
            description: 'Owner wallets keep ownerId only',
            sql: `UPDATE "public"."Wallet"
SET "userId" = NULL
WHERE "ownerId" IS NOT NULL AND "userId" IS NOT NULL`,
          },
          {
            description: 'Insert a zero-balance wallet for riders that have none',
            sql: `INSERT INTO "public"."Wallet" ("userId", "balance", "currency", "createdAt", "updatedAt")
SELECT u."id", 0, 'CDF', NOW(), NOW()
FROM "public"."User" AS u
WHERE u."type" = 'rider'
  AND NOT EXISTS (
    SELECT 1 FROM "public"."Wallet" AS w WHERE w."userId" = u."id"
  )`,
          },
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Agent',
        constraint: 'Agent_userId_key',
        columns: ['userId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'LedgerTransaction',
        constraint: 'LedgerTransaction_kind_check_94869199',
        expression: sql`"kind" IN ('float_topup', 'agent_topup', 'swap_fee', 'adjustment')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_agentId_key',
        columns: ['agentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Agent',
        foreignKey: {
          name: 'Agent_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Wallet',
        foreignKey: {
          name: 'Wallet_agentId_fkey',
          columns: ['agentId'],
          references: { schema: 'public', table: 'Agent', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
