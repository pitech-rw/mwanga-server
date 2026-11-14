#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/10f091101b43f8a22eaad66439e89d4ac926d402f303375a98eb9d69bfe7ceb9/contract';
import endContract from '../../snapshots/10f091101b43f8a22eaad66439e89d4ac926d402f303375a98eb9d69bfe7ceb9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/91d700a0b37098ef54f013b78164ad72ee97bd3d78543f7e4e8ebcc37b61da3d/contract';
import startContract from '../../snapshots/91d700a0b37098ef54f013b78164ad72ee97bd3d78543f7e4e8ebcc37b61da3d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
  rawSql,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'InventoryItem',
        columns: [
          col('batteryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('bikeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('receivedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('InventoryItem_kind_check_97e84ffd', sql`"kind" IN ('bike', 'battery')`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'InventoryMovement',
        columns: [
          col('actorUserId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'InventoryMovement_kind_check_b69a5042',
            sql`"kind" IN ('receive', 'issue_to_owner', 'issue_to_station', 'issue_to_bike', 'return_to_stock', 'adjust')`,
          ),
        ],
      }),
      this.dropNotNull({ schema: 'public', table: 'Bike', column: 'ownerId' }),
      this.addUnique({
        schema: 'public',
        table: 'InventoryItem',
        constraint: 'InventoryItem_bikeId_key',
        columns: ['bikeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'InventoryItem',
        constraint: 'InventoryItem_batteryId_key',
        columns: ['batteryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InventoryMovement',
        index: 'InventoryMovement_actorUserId_idx_96dac96c',
        columns: ['actorUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InventoryMovement',
        index: 'InventoryMovement_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InventoryItem',
        foreignKey: {
          name: 'InventoryItem_bikeId_fkey',
          columns: ['bikeId'],
          references: { schema: 'public', table: 'Bike', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InventoryItem',
        foreignKey: {
          name: 'InventoryItem_batteryId_fkey',
          columns: ['batteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InventoryMovement',
        foreignKey: {
          name: 'InventoryMovement_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'InventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InventoryMovement',
        foreignKey: {
          name: 'InventoryMovement_actorUserId_fkey',
          columns: ['actorUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      rawSql({
        id: 'data_migration.backfill_inventory_items',
        label: 'Backfill warehouse inventory for unassigned bikes and batteries',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'InventoryItem' } },
        precheck: [],
        postcheck: [],
        execute: [
          {
            description: 'Warehouse bikes (no owner, no rider)',
            sql: `INSERT INTO "public"."InventoryItem" ("kind", "bikeId", "receivedAt", "createdAt", "updatedAt")
SELECT 'bike', b."id", b."createdAt", NOW(), NOW()
FROM "public"."Bike" AS b
WHERE b."ownerId" IS NULL AND b."userId" IS NULL
  AND b."currentBatteryId" IS NULL`,
          },
          {
            description: 'Unassigned batteries (no station, not on a bike)',
            sql: `INSERT INTO "public"."InventoryItem" ("kind", "batteryId", "receivedAt", "createdAt", "updatedAt")
SELECT 'battery', bat."id", bat."createdAt", NOW(), NOW()
FROM "public"."Battery" AS bat
WHERE bat."stationId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."Bike" AS bk WHERE bk."currentBatteryId" = bat."id"
  )`,
          },
          {
            description: 'Log receive movements for backfilled bike items',
            sql: `INSERT INTO "public"."InventoryMovement" ("inventoryItemId", "kind", "details", "createdAt")
SELECT ii."id", 'receive', 'backfill', NOW()
FROM "public"."InventoryItem" AS ii
WHERE ii."kind" = 'bike'`,
          },
          {
            description: 'Log receive movements for backfilled battery items',
            sql: `INSERT INTO "public"."InventoryMovement" ("inventoryItemId", "kind", "details", "createdAt")
SELECT ii."id", 'receive', 'backfill', NOW()
FROM "public"."InventoryItem" AS ii
WHERE ii."kind" = 'battery'`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
