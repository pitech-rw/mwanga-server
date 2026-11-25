import 'dotenv/config';
import { DEFAULT_CURRENCY } from '../src/config/default-currency.js';
import { asNumeric } from '../src/prisma/errors.js';
import { db } from '../src/prisma/db.js';
import { COMPANY_FLOAT_SOURCE_REVENUE_CODE } from '../src/ledger/ledger.types.js';
import { requireDevMode } from './require-dev-mode.js';

const DEFAULT_COMPANY_ACCOUNT = {
  name: 'Primary Collections',
  bankName: 'Default Bank',
  accountNumber: 'MWANGA-PRIMARY',
  currency: DEFAULT_CURRENCY,
} as const;

const DEFAULT_REVENUE_ACCOUNT = {
  code: 'swap_fees',
  name: 'Swap Fees',
  currency: DEFAULT_CURRENCY,
} as const;

const COMPANY_FLOAT_SOURCE_ACCOUNT = {
  code: COMPANY_FLOAT_SOURCE_REVENUE_CODE,
  name: 'Company Float Source',
  currency: DEFAULT_CURRENCY,
} as const;

async function main() {
  requireDevMode('seed:ledger-accounts');
  await db.connect({ url: process.env['DATABASE_URL']! });

  const existingCompany = await db.orm.public.CompanyAccount.where({
    accountNumber: DEFAULT_COMPANY_ACCOUNT.accountNumber,
  }).first();

  if (!existingCompany) {
    await db.orm.public.CompanyAccount.create({
      ...DEFAULT_COMPANY_ACCOUNT,
      balance: asNumeric(0),
    });
    console.log('Created default company account:', DEFAULT_COMPANY_ACCOUNT.accountNumber);
  } else {
    console.log('Default company account already exists:', DEFAULT_COMPANY_ACCOUNT.accountNumber);
  }

  const existingRevenue = await db.orm.public.RevenueAccount.where({
    code: DEFAULT_REVENUE_ACCOUNT.code,
  }).first();

  if (!existingRevenue) {
    await db.orm.public.RevenueAccount.create({
      ...DEFAULT_REVENUE_ACCOUNT,
      balance: asNumeric(0),
    });
    console.log('Created default revenue account:', DEFAULT_REVENUE_ACCOUNT.code);
  } else {
    console.log('Default revenue account already exists:', DEFAULT_REVENUE_ACCOUNT.code);
  }

  const existingFloatSource = await db.orm.public.RevenueAccount.where({
    code: COMPANY_FLOAT_SOURCE_ACCOUNT.code,
  }).first();

  if (!existingFloatSource) {
    await db.orm.public.RevenueAccount.create({
      ...COMPANY_FLOAT_SOURCE_ACCOUNT,
      balance: asNumeric(0),
    });
    console.log('Created company float source account:', COMPANY_FLOAT_SOURCE_ACCOUNT.code);
  } else {
    console.log('Company float source account already exists:', COMPANY_FLOAT_SOURCE_ACCOUNT.code);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
