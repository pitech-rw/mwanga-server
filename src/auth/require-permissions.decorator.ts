import { SetMetadata } from '@nestjs/common';
import type { PermissionName } from './permission-catalog.js';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const PERMISSIONS_ANY_KEY = 'requiredPermissionsAny';

export const RequirePermissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Caller needs at least one of the listed permissions (admin bypass still applies). */
export const RequireAnyPermission = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
