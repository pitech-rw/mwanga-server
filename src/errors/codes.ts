/** Stable API codes consumed by web `messages` catalogs (language-neutral). */

export const AuthCodes = {
  invalidResetToken: 'auth.invalidResetToken',
  passwordUpdated: 'auth.passwordUpdated',
  passwordResetEmailSent: 'auth.passwordResetEmailSent',
  profileNoFields: 'auth.profileNoFields',
  profileNoPassword: 'auth.profileNoPassword',
  profileCurrentPasswordRequired: 'auth.profileCurrentPasswordRequired',
  profileCurrentPasswordIncorrect: 'auth.profileCurrentPasswordIncorrect',
  profileDuplicateIdentity: 'auth.profileDuplicateIdentity',
  invalidCredentials: 'auth.invalidCredentials',
  roleNotProvisioned: 'auth.roleNotProvisioned',
} as const;

export const UsersCodes = {
  riderRequiresOwner: 'users.riderRequiresOwner',
  ownerNotFound: 'users.ownerNotFound',
  cannotDeactivateSelf: 'users.cannotDeactivateSelf',
  duplicateIdentity: 'users.duplicateIdentity',
  userNotFound: 'users.userNotFound',
  swapperStationOnly: 'users.swapperStationOnly',
  stationNotFound: 'users.stationNotFound',
} as const;

export const OwnersCodes = {
  userNotFound: 'owners.userNotFound',
  portalUserMustBeOwner: 'owners.portalUserMustBeOwner',
  portalUserMustNotHaveOwnerId: 'owners.portalUserMustNotHaveOwnerId',
  duplicatePortalUser: 'owners.duplicatePortalUser',
  duplicateIdentity: 'owners.duplicateIdentity',
} as const;

export const WalletsCodes = {
  ownerNotFound: 'wallets.ownerNotFound',
  walletExists: 'wallets.walletExists',
} as const;

export const BikesCodes = {
  assignOwnerBeforeRider: 'bikes.assignOwnerBeforeRider',
  ownerNotFound: 'bikes.ownerNotFound',
  warehouseNoBatteryOnCreate: 'bikes.warehouseNoBatteryOnCreate',
  warehouseNoBattery: 'bikes.warehouseNoBattery',
  duplicateIdentity: 'bikes.duplicateIdentity',
} as const;

export const BatteriesCodes = {
  serialQueryRequired: 'batteries.serialQueryRequired',
  duplicateSerial: 'batteries.duplicateSerial',
  bikeAndStation: 'batteries.bikeAndStation',
  bikeHasDifferentBattery: 'batteries.bikeHasDifferentBattery',
  warehouseBikeInstall: 'batteries.warehouseBikeInstall',
} as const;

export const StationsCodes = {
  uniqueCodeFailed: 'stations.uniqueCodeFailed',
  duplicateCode: 'stations.duplicateCode',
  invalidUpdate: 'stations.invalidUpdate',
} as const;

export const SwapsCodes = {
  incomingSerialRequired: 'swaps.incomingSerialRequired',
  incomingSerialMismatch: 'swaps.incomingSerialMismatch',
  incomingSerialRequiredWhenMounted: 'swaps.incomingSerialRequiredWhenMounted',
  invalidInput: 'swaps.invalidInput',
  userNotOnBike: 'swaps.userNotOnBike',
  bikeNoFleetOwner: 'swaps.bikeNoFleetOwner',
  riderNoCard: 'swaps.riderNoCard',
  noBatteryAtStation: 'swaps.noBatteryAtStation',
  ownerWalletMissing: 'swaps.ownerWalletMissing',
  sameBatteryReturnIssue: 'swaps.sameBatteryReturnIssue',
  batteryOnAnotherBike: 'swaps.batteryOnAnotherBike',
  invalidSwapOrPaymentStatus: 'swaps.invalidSwapOrPaymentStatus',
  createFailed: 'swaps.createFailed',
  invalidSwapStatus: 'swaps.invalidSwapStatus',
  invalidPaymentStatus: 'swaps.invalidPaymentStatus',
  updateFailed: 'swaps.updateFailed',
  operatorRequired: 'swaps.operatorRequired',
  riderUserRequired: 'swaps.riderUserRequired',
  swapperRequired: 'swaps.swapperRequired',
  operatorInactive: 'swaps.operatorInactive',
  operatorNotAllowed: 'swaps.operatorNotAllowed',
  riderAccountRequired: 'swaps.riderAccountRequired',
  riderInactive: 'swaps.riderInactive',
  riderNoFleetOwnerShort: 'swaps.riderNoFleetOwnerShort',
  ownerUserNotLinked: 'swaps.ownerUserNotLinked',
  cannotOperateSwap: 'swaps.cannotOperateSwap',
  accountInactive: 'swaps.accountInactive',
} as const;

export const UploadsCodes = {
  photoRequired: 'uploads.photoRequired',
  photoTooLarge: 'uploads.photoTooLarge',
  photoInvalidType: 'uploads.photoInvalidType',
} as const;

export const CompanyAccountsCodes = {
  duplicateAccount: 'companyAccounts.duplicateAccount',
} as const;

export const ViolationsCodes = {
  entityNotFound: 'violations.entityNotFound',
  stationNotFound: 'violations.stationNotFound',
  duplicateTrackId: 'violations.duplicateTrackId',
} as const;

export const InventoryCodes = {
  warehouseBikeNoBattery: 'inventory.warehouseBikeNoBattery',
  duplicateBike: 'inventory.duplicateBike',
  duplicateBattery: 'inventory.duplicateBattery',
  notBike: 'inventory.notBike',
  ownerNotFound: 'inventory.ownerNotFound',
  notBattery: 'inventory.notBattery',
  stationNotFound: 'inventory.stationNotFound',
} as const;

export const IncidentsCodes = {
  alreadyClosed: 'incidents.alreadyClosed',
  batteryNotFound: 'incidents.batteryNotFound',
  batteryWrongStation: 'incidents.batteryWrongStation',
  batteryAlreadyFaulty: 'incidents.batteryAlreadyFaulty',
  openIncidentExists: 'incidents.openIncidentExists',
  swapNotFound: 'incidents.swapNotFound',
  swapWrongStation: 'incidents.swapWrongStation',
  trackIdFailed: 'incidents.trackIdFailed',
  batteryMissing: 'incidents.batteryMissing',
  invalidAction: 'incidents.invalidAction',
  cannotPostMessage: 'incidents.cannotPostMessage',
  batteryLeftStation: 'incidents.batteryLeftStation',
  batteryMountedOnBike: 'incidents.batteryMountedOnBike',
} as const;

export const LedgerCodes = {
  lineSingleAccount: 'ledger.lineSingleAccount',
  exactlyTwoLines: 'ledger.exactlyTwoLines',
  positiveAmount: 'ledger.positiveAmount',
  debitCreditMatch: 'ledger.debitCreditMatch',
  oneDebitOneCredit: 'ledger.oneDebitOneCredit',
  insufficientCompanyBalance: 'ledger.insufficientCompanyBalance',
  insufficientWalletBalance: 'ledger.insufficientWalletBalance',
  floatTopUpAccounts: 'ledger.floatTopUpAccounts',
  floatTopUpReferenceRequired: 'ledger.floatTopUpReferenceRequired',
  agentTopUpInvalid: 'ledger.agentTopUpInvalid',
  agentTopUpWalletPair: 'ledger.agentTopUpWalletPair',
  revenueAccountMissing: 'ledger.revenueAccountMissing',
  agentTopUpReferenceRequired: 'ledger.agentTopUpReferenceRequired',
  swapFeeAccounts: 'ledger.swapFeeAccounts',
  currencyMismatchWalletCompany: 'ledger.currencyMismatchWalletCompany',
  topUpPositive: 'ledger.topUpPositive',
  sourceNotAgentFloat: 'ledger.sourceNotAgentFloat',
  agentFloatWrongUser: 'ledger.agentFloatWrongUser',
  topUpTargetRiderOrOwner: 'ledger.topUpTargetRiderOrOwner',
  agentTargetCurrencyMismatch: 'ledger.agentTargetCurrencyMismatch',
  transferInvalid: 'ledger.transferInvalid',
  swapFeePositive: 'ledger.swapFeePositive',
  currencyMismatchWalletRevenue: 'ledger.currencyMismatchWalletRevenue',
} as const;

export const AgentsCodes = {
  duplicateAgent: 'agents.duplicateAgent',
  duplicatePortalUser: 'agents.duplicatePortalUser',
  searchTooShort: 'agents.searchTooShort',
  multipleNameMatches: 'agents.multipleNameMatches',
  multipleNameMatchesNarrow: 'agents.multipleNameMatchesNarrow',
  floatWalletMissing: 'agents.floatWalletMissing',
  userNotFound: 'agents.userNotFound',
  linkedMustBeAgent: 'agents.linkedMustBeAgent',
  portalNoOwnerId: 'agents.portalNoOwnerId',
  profileExists: 'agents.profileExists',
} as const;

export const CardsCodes = {
  duplicateCard: 'cards.duplicateCard',
} as const;

export const RolesCodes = {
  duplicateRole: 'roles.duplicateRole',
} as const;

export const ValidationCodes = {
  failed: 'validation.failed',
} as const;

export const FleetCodes = {
  userNotFound: 'fleet.userNotFound',
  assignedMustBeRiderOrOwner: 'fleet.assignedMustBeRiderOrOwner',
  riderWrongOwner: 'fleet.riderWrongOwner',
  ownerAccountMismatch: 'fleet.ownerAccountMismatch',
  ridersRequireOwnerId: 'fleet.ridersRequireOwnerId',
  ownerPortalNoOwnerId: 'fleet.ownerPortalNoOwnerId',
  agentNoOwnerId: 'fleet.agentNoOwnerId',
  onlyRidersOwnerId: 'fleet.onlyRidersOwnerId',
  riderNoFleetOwner: 'fleet.riderNoFleetOwner',
  ownerWalletMissing: 'fleet.ownerWalletMissing',
} as const;

export const CommonCodes = {
  unknown: 'unknown',
} as const;