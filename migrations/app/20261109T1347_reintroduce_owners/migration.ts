#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2de91680cf49a794116112d151ee7fae5b3d64461f1dc13a3051dde7634f4581/contract';
import startContract from '../../snapshots/2de91680cf49a794116112d151ee7fae5b3d64461f1dc13a3051dde7634f4581/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/78ed5f43229f35b6c2a1d880a129df0465e3a9eb25d6db2f296a10608590591f/contract';
import endContract from '../../snapshots/78ed5f43229f35b6c2a1d880a129df0465e3a9eb25d6db2f296a10608590591f/contract.json' with { type: 'json' };
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
        table: 'User',
        constraint: 'User_type_check_8eb0021c',
      }),
      this.createTable({
        schema: 'public',
        table: 'Owner',
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
        table: 'User',
        column: col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Bike',
        column: col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Wallet',
        column: col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      rawSql({
        id: 'data_migration.seed_owners_from_legacy_wallets',
        label: 'Create Owner rows from legacy rider wallets and link fleet',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'Owner' } },
        precheck: [],
        postcheck: [],
        execute: [
          {
            description: 'Ensure at least one Owner exists when there are bikes but no wallets',
            sql: `INSERT INTO "public"."Owner" ("name", "status", "createdAt", "updatedAt")
SELECT 'Default fleet', 'active', NOW(), NOW()
WHERE (SELECT COUNT(*) FROM "public"."Owner") = 0
  AND (SELECT COUNT(*) FROM "public"."Bike") > 0`,
          },
          {
            description: 'Insert Owner per legacy Wallet.userId',
            sql: `INSERT INTO "public"."Owner" ("name", "email", "phone", "status", "createdAt", "updatedAt")
SELECT
  TRIM(CONCAT(u."firstName", ' ', u."lastName")),
  u."email",
  u."phone",
  'active',
  NOW(),
  NOW()
FROM (SELECT DISTINCT "userId" FROM "public"."Wallet") AS w
INNER JOIN "public"."User" AS u ON u."id" = w."userId"
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."Owner" AS o
  WHERE o."email" IS NOT DISTINCT FROM u."email"
)`,
          },
          {
            description: 'Point Wallet.ownerId at Owner for previous Wallet.userId',
            sql: `UPDATE "public"."Wallet" AS w
SET "ownerId" = o."id"
FROM "public"."User" AS u
INNER JOIN "public"."Owner" AS o ON o."email" IS NOT DISTINCT FROM u."email"
WHERE w."userId" = u."id" AND w."ownerId" IS NULL`,
          },
          {
            description: 'Set rider User.ownerId from fleet wallet owner',
            sql: `UPDATE "public"."User" AS u
SET "ownerId" = w."ownerId"
FROM "public"."Wallet" AS w
WHERE w."userId" = u."id" AND u."type" = 'rider' AND u."ownerId" IS NULL AND w."ownerId" IS NOT NULL`,
          },
          {
            description: 'Set Bike.ownerId from assigned rider fleet',
            sql: `UPDATE "public"."Bike" AS b
SET "ownerId" = u."ownerId"
FROM "public"."User" AS u
WHERE b."userId" = u."id" AND u."ownerId" IS NOT NULL AND b."ownerId" IS NULL`,
          },
          {
            description: 'Fallback Bike.ownerId to sole Owner when unassigned',
            sql: `UPDATE "public"."Bike" AS b
SET "ownerId" = (SELECT MIN(o."id") FROM "public"."Owner" AS o)
WHERE b."ownerId" IS NULL
  AND (SELECT COUNT(*) FROM "public"."Owner") >= 1`,
          },
        ],
      }),
      this.setNotNull({ schema: 'public', table: 'Wallet', column: 'ownerId' }),
      this.setNotNull({ schema: 'public', table: 'Bike', column: 'ownerId' }),
      this.dropConstraint({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({ schema: 'public', table: 'Wallet', constraint: 'Wallet_userId_key' }),
      this.dropColumn({ schema: 'public', table: 'Wallet', column: 'userId' }),
      this.addUnique({
        schema: 'public',
        table: 'Owner',
        constraint: 'Owner_userId_key',
        columns: ['userId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_type_check_e9f15815',
        expression: sql`"type" IN ('admin', 'office', 'office_manager', 'swapper', 'agent', 'owner', 'rider', 'viewer')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_ownerId_key',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Bike',
        index: 'Bike_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Owner',
        foreignKey: {
          name: 'Owner_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Bike',
        foreignKey: {
          name: 'Bike_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'Owner', columns: ['id'] },
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
          name: 'Wallet_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'Owner', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
