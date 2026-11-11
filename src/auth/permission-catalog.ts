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
  // riders have been deprecated, but we keep the permissions for backwards compatibility
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
  agents: {
    read: 'agents:read',
    write: 'agents:write',
    delete: 'agents:delete',
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
    credit: 'wallets:credit',
    agentTopup: 'wallets:agent-topup',
    delete: 'wallets:delete',
  },
  companyAccounts: {
    read: 'company-accounts:read',
    write: 'company-accounts:write',
  },
  swaps: {
    read: 'swaps:read',
    operate: 'swaps:operate',
    write: 'swaps:write',
    delete: 'swaps:delete',
    override: 'swaps:override',
  },
  violations: {
    read: 'violations:read',
    write: 'violations:write',
    delete: 'violations:delete',
  },
} as const;

export type PermissionName =
  | (typeof PERMISSIONS.system)[keyof typeof PERMISSIONS.system]
  | (typeof PERMISSIONS.users)[keyof typeof PERMISSIONS.users]
  | (typeof PERMISSIONS.roles)[keyof typeof PERMISSIONS.roles]
  | (typeof PERMISSIONS.riders)[keyof typeof PERMISSIONS.riders]
  | (typeof PERMISSIONS.owners)[keyof typeof PERMISSIONS.owners]
  | (typeof PERMISSIONS.agents)[keyof typeof PERMISSIONS.agents]
  | (typeof PERMISSIONS.bikes)[keyof typeof PERMISSIONS.bikes]
  | (typeof PERMISSIONS.cards)[keyof typeof PERMISSIONS.cards]
  | (typeof PERMISSIONS.batteries)[keyof typeof PERMISSIONS.batteries]
  | (typeof PERMISSIONS.stations)[keyof typeof PERMISSIONS.stations]
  | (typeof PERMISSIONS.wallets)[keyof typeof PERMISSIONS.wallets]
  | (typeof PERMISSIONS.companyAccounts)[keyof typeof PERMISSIONS.companyAccounts]
  | (typeof PERMISSIONS.swaps)[keyof typeof PERMISSIONS.swaps]
  | (typeof PERMISSIONS.violations)[keyof typeof PERMISSIONS.violations];

const readPermissions = [
  PERMISSIONS.users.read,
  PERMISSIONS.roles.read,
  PERMISSIONS.riders.read,
  PERMISSIONS.owners.read,
  PERMISSIONS.agents.read,
  PERMISSIONS.bikes.read,
  PERMISSIONS.cards.read,
  PERMISSIONS.batteries.read,
  PERMISSIONS.stations.read,
  PERMISSIONS.wallets.read,
  PERMISSIONS.companyAccounts.read,
  PERMISSIONS.swaps.read,
  PERMISSIONS.violations.read,
] as const;

const crmWritePermissions = [
  PERMISSIONS.riders.write,
  PERMISSIONS.owners.write,
  PERMISSIONS.agents.write,
  PERMISSIONS.bikes.write,
  PERMISSIONS.cards.write,
  PERMISSIONS.batteries.write,
  PERMISSIONS.stations.write,
  PERMISSIONS.wallets.write,
  PERMISSIONS.violations.write,
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
    PERMISSIONS.wallets.credit,
    PERMISSIONS.companyAccounts.write,
    PERMISSIONS.users.read,
    PERMISSIONS.users.write,
    PERMISSIONS.roles.read,
    PERMISSIONS.riders.delete,
    PERMISSIONS.owners.delete,
    PERMISSIONS.agents.delete,
    PERMISSIONS.bikes.delete,
    PERMISSIONS.cards.delete,
    PERMISSIONS.batteries.delete,
    PERMISSIONS.stations.delete,
    PERMISSIONS.wallets.delete,
    PERMISSIONS.swaps.write,
    PERMISSIONS.swaps.delete,
    PERMISSIONS.violations.delete,
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
    PERMISSIONS.violations.read,
    PERMISSIONS.violations.write,
  ],

  /** Field agent: own float wallet, top-ups into rider or owner wallets */
  agent: [
    PERMISSIONS.agents.read,
    PERMISSIONS.riders.read,
    PERMISSIONS.riders.write,
    PERMISSIONS.owners.read,
    PERMISSIONS.owners.write,
    PERMISSIONS.bikes.read,
    PERMISSIONS.cards.read,
    PERMISSIONS.cards.write,
    PERMISSIONS.batteries.read,
    PERMISSIONS.stations.read,
    PERMISSIONS.wallets.read,
    PERMISSIONS.wallets.agentTopup,
    PERMISSIONS.violations.read,
    PERMISSIONS.violations.write,
  ],

  /**
   * End-user with User.type=rider (e.g. rider mobile app).
   * List/detail responses are scoped to their own user id in services (see read-scope.ts).
   */
  rider: [
    PERMISSIONS.swaps.read,
    PERMISSIONS.wallets.read,
    PERMISSIONS.stations.read,
  ],

  /** Fleet proprietor portal: own owner record, wallet, bikes, and riders in fleet */
  owner: [
    PERMISSIONS.owners.read,
    PERMISSIONS.bikes.read,
    PERMISSIONS.swaps.read,
    PERMISSIONS.wallets.read,
    PERMISSIONS.users.read,
    PERMISSIONS.stations.read,
    PERMISSIONS.cards.read,
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
