import { SetMetadata } from '@nestjs/common';
import type { PermissionName } from './permission-catalog.js';

export const PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
