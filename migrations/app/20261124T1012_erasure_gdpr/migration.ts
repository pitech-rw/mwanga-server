#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0ea8e8c990d74e01c68ad2dfa9543594c49243f40b13bf1f10a5bf6b6ceaa1f5/contract';
import startContract from '../../snapshots/0ea8e8c990d74e01c68ad2dfa9543594c49243f40b13bf1f10a5bf6b6ceaa1f5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/816069f6a20078ad6b1fd7a256cb735ca8b816e4039b49fdb06f13488683c87b/contract';
import endContract from '../../snapshots/816069f6a20078ad6b1fd7a256cb735ca8b816e4039b49fdb06f13488683c87b/contract.json' with { type: 'json' };
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
        table: 'ErasureRequest',
        columns: [
          col('approvedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('approvedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('completedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ErasureRequest_status_check_d672ce09',
            sql`"status" IN ('pending', 'pending_approval', 'approved', 'rejected', 'completed')`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('erasedAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'ErasureRequest',
        index: 'ErasureRequest_approvedById_idx_01ef8410',
        columns: ['approvedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ErasureRequest',
        index: 'ErasureRequest_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ErasureRequest',
        foreignKey: {
          name: 'ErasureRequest_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ErasureRequest',
        foreignKey: {
          name: 'ErasureRequest_approvedById_fkey',
          columns: ['approvedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
