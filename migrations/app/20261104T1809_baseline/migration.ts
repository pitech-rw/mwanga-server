#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c926b7fcc80c17523d8668473e654350526a31ea617d29339754fac029e5b9e7/contract';
import endContract from '../../snapshots/c926b7fcc80c17523d8668473e654350526a31ea617d29339754fac029e5b9e7/contract.json' with { type: 'json' };
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

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actor', 'text', {
            notNull: true,
            default: lit('system'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('swapTransactionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Battery',
        columns: [
          col('batteryType', 'text', {
            notNull: true,
            default: lit('lithium'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('cycleCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('manufacturer', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('oem', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serialNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('soc', 'int4', {
            notNull: true,
            default: lit(100),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('soh', 'int4', {
            notNull: true,
            default: lit(100),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('stationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('available'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('voltage', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BatteryReading',
        columns: [
          col('batteryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('cycleCount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('recordedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('soc', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('soh', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('swapTransactionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('voltage', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BatteryReading_direction_check_57535cc1',
            sql`"direction" IN ('in', 'out')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Bike',
        columns: [
          col('chassisNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currentBatteryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('plateNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('riderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('serialNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LedgerEntry',
        columns: [
          col('amount', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('swapTransactionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'NfcCard',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('riderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('serialNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
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
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Permission',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Rider',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kycStatus', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Role',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Station',
        columns: [
          col('capacity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SwapTransaction',
        columns: [
          col('assignedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('bikeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('cancelledAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('cardId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('collectedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('completedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('failedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('fee', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('newBatteryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('oldBatteryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentStatus', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('riderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('stationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('initiated'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('swapperId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('walletBalanceAfter', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'SwapTransaction_paymentStatus_check_185c599f',
            sql`"paymentStatus" IN ('pending', 'captured', 'failed', 'reversed')`,
          ),
          checkExpression(
            'SwapTransaction_status_check_eb88f4d7',
            sql`"status" IN ('initiated', 'assigned', 'collected', 'installed', 'completed', 'failed', 'cancelled', 'reversed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nationalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_type_check_d69fdc33',
            sql`"type" IN ('rider', 'office', 'swapper', 'agent', 'customer')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Wallet',
        columns: [
          col('balance', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
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
          col('riderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Battery',
        constraint: 'Battery_serialNumber_key',
        columns: ['serialNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BatteryReading',
        constraint: 'BatteryReading_swapTransactionId_direction_key',
        columns: ['swapTransactionId', 'direction'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Bike',
        constraint: 'Bike_plateNumber_key',
        columns: ['plateNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Bike',
        constraint: 'Bike_chassisNumber_key',
        columns: ['chassisNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Bike',
        constraint: 'Bike_serialNumber_key',
        columns: ['serialNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Bike',
        constraint: 'Bike_currentBatteryId_key',
        columns: ['currentBatteryId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'NfcCard',
        constraint: 'NfcCard_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'NfcCard',
        constraint: 'NfcCard_serialNumber_key',
        columns: ['serialNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Owner',
        constraint: 'Owner_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Permission',
        constraint: 'Permission_roleId_name_key',
        columns: ['roleId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Rider',
        constraint: 'Rider_phone_key',
        columns: ['phone'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Rider',
        constraint: 'Rider_idNumber_key',
        columns: ['idNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Role',
        constraint: 'Role_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Station',
        constraint: 'Station_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_username_key',
        columns: ['username'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_phone_key',
        columns: ['phone'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_nationalId_key',
        columns: ['nationalId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Wallet',
        constraint: 'Wallet_riderId_key',
        columns: ['riderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_swapTransactionId_idx_64f4df5e',
        columns: ['swapTransactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Battery',
        index: 'Battery_stationId_idx_0626a60c',
        columns: ['stationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BatteryReading',
        index: 'BatteryReading_batteryId_idx_87376261',
        columns: ['batteryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BatteryReading',
        index: 'BatteryReading_swapTransactionId_idx_64f4df5e',
        columns: ['swapTransactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Bike',
        index: 'Bike_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Bike',
        index: 'Bike_riderId_idx_966752c5',
        columns: ['riderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LedgerEntry',
        index: 'LedgerEntry_swapTransactionId_idx_64f4df5e',
        columns: ['swapTransactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'NfcCard',
        index: 'NfcCard_riderId_idx_966752c5',
        columns: ['riderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Permission',
        index: 'Permission_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Rider',
        index: 'Rider_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_bikeId_idx_a4008bfd',
        columns: ['bikeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_cardId_idx_c511c1e1',
        columns: ['cardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_newBatteryId_idx_46180cc3',
        columns: ['newBatteryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_oldBatteryId_idx_cdbd3cde',
        columns: ['oldBatteryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_riderId_idx_966752c5',
        columns: ['riderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_stationId_idx_0626a60c',
        columns: ['stationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SwapTransaction',
        index: 'SwapTransaction_swapperId_idx_db16cbd2',
        columns: ['swapperId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuditLog',
        foreignKey: {
          name: 'AuditLog_swapTransactionId_fkey',
          columns: ['swapTransactionId'],
          references: { schema: 'public', table: 'SwapTransaction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Battery',
        foreignKey: {
          name: 'Battery_stationId_fkey',
          columns: ['stationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BatteryReading',
        foreignKey: {
          name: 'BatteryReading_batteryId_fkey',
          columns: ['batteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BatteryReading',
        foreignKey: {
          name: 'BatteryReading_swapTransactionId_fkey',
          columns: ['swapTransactionId'],
          references: { schema: 'public', table: 'SwapTransaction', columns: ['id'] },
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
        table: 'Bike',
        foreignKey: {
          name: 'Bike_riderId_fkey',
          columns: ['riderId'],
          references: { schema: 'public', table: 'Rider', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Bike',
        foreignKey: {
          name: 'Bike_currentBatteryId_fkey',
          columns: ['currentBatteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LedgerEntry',
        foreignKey: {
          name: 'LedgerEntry_swapTransactionId_fkey',
          columns: ['swapTransactionId'],
          references: { schema: 'public', table: 'SwapTransaction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NfcCard',
        foreignKey: {
          name: 'NfcCard_riderId_fkey',
          columns: ['riderId'],
          references: { schema: 'public', table: 'Rider', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Permission',
        foreignKey: {
          name: 'Permission_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'Role', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Rider',
        foreignKey: {
          name: 'Rider_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'Owner', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_riderId_fkey',
          columns: ['riderId'],
          references: { schema: 'public', table: 'Rider', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_bikeId_fkey',
          columns: ['bikeId'],
          references: { schema: 'public', table: 'Bike', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_stationId_fkey',
          columns: ['stationId'],
          references: { schema: 'public', table: 'Station', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_cardId_fkey',
          columns: ['cardId'],
          references: { schema: 'public', table: 'NfcCard', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_swapperId_fkey',
          columns: ['swapperId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_oldBatteryId_fkey',
          columns: ['oldBatteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SwapTransaction',
        foreignKey: {
          name: 'SwapTransaction_newBatteryId_fkey',
          columns: ['newBatteryId'],
          references: { schema: 'public', table: 'Battery', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'Role', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Wallet',
        foreignKey: {
          name: 'Wallet_riderId_fkey',
          columns: ['riderId'],
          references: { schema: 'public', table: 'Rider', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
