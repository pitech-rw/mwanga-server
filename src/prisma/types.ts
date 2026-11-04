import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { Models } from './contract.js';

export type User = Scalars<Models.public_User>;
export type UserType = Models.public_User['type'];
export type Role = Scalars<Models.public_Role>;
export type Permission = Scalars<Models.public_Permission>;
export type Owner = Scalars<Models.public_Owner>;
export type Rider = Scalars<Models.public_Rider>;
export type Bike = Scalars<Models.public_Bike>;
export type Station = Scalars<Models.public_Station>;
export type Battery = Scalars<Models.public_Battery>;
export type NfcCard = Scalars<Models.public_NfcCard>;
export type Wallet = Scalars<Models.public_Wallet>;
export type SwapTransaction = Scalars<Models.public_SwapTransaction>;
export type SwapStatus = Models.public_SwapTransaction['status'];
export type PaymentStatus = Models.public_SwapTransaction['paymentStatus'];
