#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6d58290afa308a8abbee6e13f4c7cd58b37b5f43523116b2595f892a311507a0/contract';
import endContract from '../../snapshots/6d58290afa308a8abbee6e13f4c7cd58b37b5f43523116b2595f892a311507a0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/caa06bdabf57f32eefc0621c43cf15bfab619b671f2b3eadaa89937854dd3a20/contract';
import startContract from '../../snapshots/caa06bdabf57f32eefc0621c43cf15bfab619b671f2b3eadaa89937854dd3a20/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_type_check_d69fdc33',
      }),
      this.removeStoredValue({
        schema: 'public',
        table: 'User',
        column: 'type',
        value: 'customer',
        codecRef: { codecId: 'pg/text@1' },
        enumValue: { namespaceId: 'public', enum: 'UserType', member: 'customer' },
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_type_check_8eb0021c',
        expression: sql`"type" IN ('admin', 'office', 'office_manager', 'swapper', 'agent', 'rider', 'viewer')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
