#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0f5451dd2a46d1997c07c95a46bc8b98e7fdb54b968f6ea65dccbbdbb8ae79be/contract';
import endContract from '../../snapshots/0f5451dd2a46d1997c07c95a46bc8b98e7fdb54b968f6ea65dccbbdbb8ae79be/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/edb1c8d64cd2fe3d7492eb2d9c836cb9ec06681a05c7bc9806ceea05050e9f19/contract';
import startContract from '../../snapshots/edb1c8d64cd2fe3d7492eb2d9c836cb9ec06681a05c7bc9806ceea05050e9f19/contract.json' with { type: 'json' };
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
        table: 'Incident',
        columns: [
          col('batteryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('damagedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('damagedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('dismissedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('dismissedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reporterId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('stationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('swapTransactionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('trackId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Incident_status_check_cea09e09',
            sql`"status" IN ('open', 'awaiting_swapper', 'awaiting_review', 'damaged', 'dismissed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'IncidentMessage',
        columns: [
          col('authorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('incidentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'IncidentMessage_kind_check_c1a5d38a',
            sql`"kind" IN ('initial', 'question', 'reply', 'resolution', 'note')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Incident',
        constraint: 'Incident_trackId_key',
        columns: ['trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_batteryId_idx_87376261',
        columns: ['batteryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_damagedById_idx_e34fe774',
        columns: ['damagedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_dismissedById_idx_2aa6c68a',
        columns: ['dismissedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_reporterId_idx_aa245831',
        columns: ['reporterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_stationId_idx_0626a60c',
        columns: ['stationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Incident',
        index: 'Incident_swapTransactionId_idx_64f4df5e',
        columns: ['swapTransactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IncidentMessage',
        index: 'IncidentMessage_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IncidentMessage',
        index: 'IncidentMessage_incidentId_idx_20b6f3c9',
        columns: ['incidentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_batteryId_fkey',
          columns: ['batteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_stationId_fkey',
          columns: ['stationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_reporterId_fkey',
          columns: ['reporterId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_swapTransactionId_fkey',
          columns: ['swapTransactionId'],
          references: { schema: 'public', table: 'SwapTransaction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_damagedById_fkey',
          columns: ['damagedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Incident',
        foreignKey: {
          name: 'Incident_dismissedById_fkey',
          columns: ['dismissedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IncidentMessage',
        foreignKey: {
          name: 'IncidentMessage_incidentId_fkey',
          columns: ['incidentId'],
          references: { schema: 'public', table: 'Incident', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IncidentMessage',
        foreignKey: {
          name: 'IncidentMessage_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
