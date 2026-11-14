#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/10f091101b43f8a22eaad66439e89d4ac926d402f303375a98eb9d69bfe7ceb9/contract';
import startContract from '../../snapshots/10f091101b43f8a22eaad66439e89d4ac926d402f303375a98eb9d69bfe7ceb9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/edb1c8d64cd2fe3d7492eb2d9c836cb9ec06681a05c7bc9806ceea05050e9f19/contract';
import endContract from '../../snapshots/edb1c8d64cd2fe3d7492eb2d9c836cb9ec06681a05c7bc9806ceea05050e9f19/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'InventoryMovement',
        constraint: 'InventoryMovement_inventoryItemId_fkey',
        kind: 'foreignKey',
      }),
      this.addColumn({
        schema: 'public',
        table: 'InventoryMovement',
        column: col('batteryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'InventoryMovement',
        column: col('bikeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'InventoryMovement', column: 'inventoryItemId' }),
      this.addForeignKey({
        schema: 'public',
        table: 'InventoryMovement',
        foreignKey: {
          name: 'InventoryMovement_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'InventoryItem', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      rawSql({
        id: 'data_migration.backfill_movement_asset_ids',
        label: 'Copy bike/battery ids from inventory items onto movements',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'InventoryMovement' } },
        precheck: [],
        postcheck: [],
        execute: [
          {
            description: 'Set bikeId/batteryId from parent item',
            sql: `UPDATE "public"."InventoryMovement" AS m
SET
  "bikeId" = i."bikeId",
  "batteryId" = i."batteryId"
FROM "public"."InventoryItem" AS i
WHERE m."inventoryItemId" = i."id"`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
