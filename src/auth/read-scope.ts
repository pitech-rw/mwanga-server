import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UserType } from '../prisma/types.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Roles that see the full dataset on read endpoints.
 * All other roles get row-level scoping in services (participation / own resources).
 */
/** viewer = read-only audit dashboard; same global read as back-office staff */
const UNRESTRICTED_READ_USER_TYPES = new Set<UserType>([
  'admin',
  'office',
  'office_manager',
  'viewer',
]);

export type ReadScopeContext = {
  user: AuthenticatedUser;
  /** When true, skip row-level checks (caller already verified system:admin). */
  isAdminBypass: boolean;
};

export function isUnrestrictedRead(ctx: ReadScopeContext): boolean {
  return ctx.isAdminBypass || UNRESTRICTED_READ_USER_TYPES.has(ctx.user.type as UserType);
}

/** @throws ForbiddenException if the actor may not read this user id */
export function assertCanReadUserId(ctx: ReadScopeContext, targetUserId: number): void {
  if (isUnrestrictedRead(ctx)) {
    return;
  }
  if (ctx.user.sub !== targetUserId) {
    throw new ForbiddenException('You may only read your own user record');
  }
}

/**
 * Wallet read access: back office sees all; owner/rider see fleet wallet only.
 */
export type WalletReadScope =
  | { mode: 'unrestricted' }
  | { mode: 'fleet'; actorUserId: number; actorType: UserType };

export function walletReadScope(ctx: ReadScopeContext): WalletReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  if (ctx.user.type === 'owner' || ctx.user.type === 'rider') {
    return { mode: 'fleet', actorUserId: ctx.user.sub, actorType: ctx.user.type as UserType };
  }
  throw new ForbiddenException('Insufficient scope to list wallets');
}

/** Bikes: agent sees assigned bike; swapper sees bikes that appear at their station (or own assignment). */
export type BikeReadScope =
  | { mode: 'unrestricted' }
  | { mode: 'agent'; userId: number }
  | { mode: 'swapper'; stationId: number; userId: number }
  | { mode: 'fleet'; actorUserId: number; actorType: UserType };

export function bikeReadScope(ctx: ReadScopeContext): BikeReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  if (ctx.user.type === 'owner') {
    return { mode: 'fleet', actorUserId: ctx.user.sub, actorType: 'owner' };
  }
  if (ctx.user.type === 'agent') {
    return { mode: 'agent', userId: ctx.user.sub };
  }
  if (ctx.user.type === 'swapper') {
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    return { mode: 'swapper', stationId: ctx.user.stationId, userId: ctx.user.sub };
  }
  throw new ForbiddenException('Insufficient scope to list bikes');
}

/** NFC cards: same pattern as bikes (agent = assigned card; swapper = cards used in swaps at station). */
export type CardReadScope =
  | { mode: 'unrestricted' }
  | { mode: 'agent'; userId: number }
  | { mode: 'swapper'; stationId: number; userId: number };

export function cardReadScope(ctx: ReadScopeContext): CardReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  if (ctx.user.type === 'agent') {
    return { mode: 'agent', userId: ctx.user.sub };
  }
  if (ctx.user.type === 'swapper') {
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    return { mode: 'swapper', stationId: ctx.user.stationId, userId: ctx.user.sub };
  }
  throw new ForbiddenException('Insufficient scope to list NFC cards');
}

/**
 * Stations: swapper is limited to assigned station; others use unrestricted sets above.
 */
export function stationReadFilter(ctx: ReadScopeContext):
  | { unrestricted: true }
  | { unrestricted: false; stationId: number } {
  if (isUnrestrictedRead(ctx)) {
    return { unrestricted: true };
  }
  // Riders and field agents need the station directory (maps, assignment); not limited to one station.
  if (ctx.user.type === 'rider' || ctx.user.type === 'agent') {
    return { unrestricted: true };
  }
  if (ctx.user.type === 'swapper') {
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    return { unrestricted: false, stationId: ctx.user.stationId };
  }
  throw new ForbiddenException('Insufficient scope to list stations');
}

/**
 * Batteries at a station (inventory): swapper sees their station only; rider/agent have no battery inventory read.
 */
export function batteryReadFilter(ctx: ReadScopeContext):
  | { unrestricted: true }
  | { unrestricted: false; stationId: number } {
  if (isUnrestrictedRead(ctx)) {
    return { unrestricted: true };
  }
  if (ctx.user.type === 'swapper') {
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    return { unrestricted: false, stationId: ctx.user.stationId };
  }
  throw new ForbiddenException('Insufficient scope to list batteries');
}

/** Swaps: rider = own rows; swapper = swaps at assigned station (404 on other stations). */
export type SwapReadScope =
  | { mode: 'unrestricted' }
  | { mode: 'rider'; userId: number }
  | { mode: 'swapper'; stationId: number };

export type OwnerReadScope = { mode: 'unrestricted' } | { mode: 'portal'; userId: number };

export function ownerReadScope(ctx: ReadScopeContext): OwnerReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  if (ctx.user.type === 'owner') {
    return { mode: 'portal', userId: ctx.user.sub };
  }
  throw new ForbiddenException('Insufficient scope to read owners');
}

export function swapReadScope(ctx: ReadScopeContext): SwapReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  switch (ctx.user.type) {
    case 'rider':
    case 'owner':
      return { mode: 'rider', userId: ctx.user.sub };
    case 'swapper':
      if (ctx.user.stationId == null) {
        throw new ForbiddenException('Swapper is not assigned to a station');
      }
      return { mode: 'swapper', stationId: ctx.user.stationId };
    default:
      throw new ForbiddenException('Insufficient scope to read swap transactions');
  }
}

/** Violations: reporter or offender may read; station swapper may read rows for their station. */
export type ViolationReadScope =
  | { mode: 'unrestricted' }
  | { mode: 'participant'; userId: number }
  | { mode: 'swapper_station'; stationId: number; userId: number };

export function violationReadScope(ctx: ReadScopeContext): ViolationReadScope {
  if (isUnrestrictedRead(ctx)) {
    return { mode: 'unrestricted' };
  }
  if (ctx.user.type === 'swapper') {
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    return { mode: 'swapper_station', stationId: ctx.user.stationId, userId: ctx.user.sub };
  }
  return { mode: 'participant', userId: ctx.user.sub };
}

/**
 * Use when a scoped read found no row: 404 for swapper (station mismatch) or wrong-id snooping,
 * 403 when the user is not allowed to read the resource type at all.
 */
export function denyOrNotFoundForScopedRead(
  ctx: ReadScopeContext,
  reason: 'wrong_station' | 'not_owner' | 'not_participant',
): never {
  if (ctx.user.type === 'swapper' && reason === 'wrong_station') {
    throw new NotFoundException('Resource not found');
  }
  throw new ForbiddenException('You may not read this resource');
}

export function assertCanReadRoles(ctx: ReadScopeContext): void {
  if (!isUnrestrictedRead(ctx)) {
    throw new ForbiddenException('Insufficient scope to read roles');
  }
}
