#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract';
import endContract from '../../snapshots/6ae4dc14ddac2242bf7cb495eed3117b40677de634aaf73fbcc5a7dadede469c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6d58290afa308a8abbee6e13f4c7cd58b37b5f43523116b2595f892a311507a0/contract';
import startContract from '../../snapshots/6d58290afa308a8abbee6e13f4c7cd58b37b5f43523116b2595f892a311507a0/contract.json' with { type: 'json' };
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
        table: 'Violation',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('occurredAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('offenderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reporterId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('severity', 'text', {
            notNull: true,
            default: lit('medium'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trackId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Violation_severity_check_48ba1e43',
            sql`"severity" IN ('low', 'medium', 'high', 'critical')`,
          ),
          checkExpression(
            'Violation_status_check_e9b2e4e8',
            sql`"status" IN ('open', 'under_review', 'resolved', 'dismissed')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Violation',
        constraint: 'Violation_trackId_key',
        columns: ['trackId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Violation',
        index: 'Violation_offenderId_idx_a054d9b8',
        columns: ['offenderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Violation',
        index: 'Violation_reporterId_idx_aa245831',
        columns: ['reporterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Violation',
        index: 'Violation_stationId_idx_0626a60c',
        columns: ['stationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Violation',
        foreignKey: {
          name: 'Violation_stationId_fkey',
          columns: ['stationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Violation',
        foreignKey: {
          name: 'Violation_reporterId_fkey',
          columns: ['reporterId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Violation',
        foreignKey: {
          name: 'Violation_offenderId_fkey',
          columns: ['offenderId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
