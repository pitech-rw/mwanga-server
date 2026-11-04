/**
 * Canonical permission strings for Mwanga API authorization.
 *
 * Convention: `{resource}:{action}`
 * - read:   GET collection + GET by id
 * - write:  POST + PATCH
 * - delete: DELETE
 * - operate: swap station workflow (assign + complete steps)
 * - override: manual battery assignment override (authorized ops only)
 * - admin: bypass all permission checks (system scope)
 */
export const PERMISSIONS = {
  system: {
    admin: 'system:admin',
  },
  users: {
    read: 'users:read',
    write: 'users:write',
    delete: 'users:delete',
  },
  roles: {
    read: 'roles:read',
    write: 'roles:write',
    delete: 'roles:delete',
  },
  riders: {
    read: 'riders:read',
    write: 'riders:write',
    delete: 'riders:delete',
  },
  owners: {
    read: 'owners:read',
    write: 'owners:write',
    delete: 'owners:delete',
  },
  bikes: {
    read: 'bikes:read',
    write: 'bikes:write',
    delete: 'bikes:delete',
  },
  cards: {
    read: 'cards:read',
    write: 'cards:write',
    delete: 'cards:delete',
  },
  batteries: {
    read: 'batteries:read',
    write: 'batteries:write',
    delete: 'batteries:delete',
  },
  stations: {
    read: 'stations:read',
    write: 'stations:write',
    delete: 'stations:delete',
  },
  wallets: {
    read: 'wallets:read',
    write: 'wallets:write',
    delete: 'wallets:delete',
  },
  swaps: {
    read: 'swaps:read',
    operate: 'swaps:operate',
    write: 'swaps:write',
    delete: 'swaps:delete',
    override: 'swaps:override',
  },
} as const;

export type PermissionName =
  | (typeof PERMISSIONS.system)[keyof typeof PERMISSIONS.system]
  | (typeof PERMISSIONS.users)[keyof typeof PERMISSIONS.users]
  | (typeof PERMISSIONS.roles)[keyof typeof PERMISSIONS.roles]
  | (typeof PERMISSIONS.riders)[keyof typeof PERMISSIONS.riders]
  | (typeof PERMISSIONS.owners)[keyof typeof PERMISSIONS.owners]
  | (typeof PERMISSIONS.bikes)[keyof typeof PERMISSIONS.bikes]
  | (typeof PERMISSIONS.cards)[keyof typeof PERMISSIONS.cards]
  | (typeof PERMISSIONS.batteries)[keyof typeof PERMISSIONS.batteries]
  | (typeof PERMISSIONS.stations)[keyof typeof PERMISSIONS.stations]
  | (typeof PERMISSIONS.wallets)[keyof typeof PERMISSIONS.wallets]
  | (typeof PERMISSIONS.swaps)[keyof typeof PERMISSIONS.swaps];

const readPermissions = [
  PERMISSIONS.users.read,
  PERMISSIONS.roles.read,
  PERMISSIONS.riders.read,
  PERMISSIONS.owners.read,
  PERMISSIONS.bikes.read,
  PERMISSIONS.cards.read,
  PERMISSIONS.batteries.read,
  PERMISSIONS.stations.read,
  PERMISSIONS.wallets.read,
  PERMISSIONS.swaps.read,
] as const;

const crmWritePermissions = [
  PERMISSIONS.riders.write,
  PERMISSIONS.owners.write,
  PERMISSIONS.bikes.write,
  PERMISSIONS.cards.write,
  PERMISSIONS.batteries.write,
  PERMISSIONS.stations.write,
  PERMISSIONS.wallets.write,
] as const;

/**
 * Default permission sets keyed by Role.name (created/updated by seed script).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly PermissionName[]> = {
  /** Full platform access */
  admin: [PERMISSIONS.system.admin],

  /** Back-office CRM + inventory; view swaps, no station workflow */
  office: [...readPermissions, ...crmWritePermissions],

  /** Office lead: user administration + destructive CRM actions */
  office_manager: [
    ...readPermissions,
    ...crmWritePermissions,
    PERMISSIONS.users.read,
    PERMISSIONS.users.write,
    PERMISSIONS.roles.read,
    PERMISSIONS.riders.delete,
    PERMISSIONS.owners.delete,
    PERMISSIONS.bikes.delete,
    PERMISSIONS.cards.delete,
    PERMISSIONS.batteries.delete,
    PERMISSIONS.stations.delete,
    PERMISSIONS.wallets.delete,
    PERMISSIONS.swaps.write,
    PERMISSIONS.swaps.delete,
  ],

  /** Station swap executive app */
  swapper: [
    PERMISSIONS.swaps.read,
    PERMISSIONS.swaps.operate,
    PERMISSIONS.riders.read,
    PERMISSIONS.bikes.read,
    PERMISSIONS.cards.read,
    PERMISSIONS.batteries.read,
    PERMISSIONS.stations.read,
    PERMISSIONS.wallets.read,
  ],

  /** Field agent: rider/card registration (no station swap workflow) */
  agent: [
    PERMISSIONS.riders.read,
    PERMISSIONS.riders.write,
    PERMISSIONS.bikes.read,
    PERMISSIONS.cards.read,
    PERMISSIONS.cards.write,
    PERMISSIONS.batteries.read,
    PERMISSIONS.stations.read,
    PERMISSIONS.wallets.read,
  ],

  /**
   * End-user with User.type=rider (e.g. rider mobile app).
   * Global list endpoints still return all rows until own-data scoping is added in services.
   */
  rider: [
    PERMISSIONS.swaps.read,
    PERMISSIONS.wallets.read,
    PERMISSIONS.stations.read,
  ],

  /** Read-only dashboard / audit */
  viewer: readPermissions,
};

export const ALL_KNOWN_PERMISSIONS: PermissionName[] = Object.values(PERMISSIONS).flatMap(
  (group) => Object.values(group),
) as PermissionName[];

/** User.type values — must match Role.name for default roles */
export type UserTypeName = keyof typeof DEFAULT_ROLE_PERMISSIONS;

export const USER_TYPE_NAMES = Object.keys(
  DEFAULT_ROLE_PERMISSIONS,
) as UserTypeName[];
