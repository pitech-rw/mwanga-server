import 'dotenv/config';
import { asNumeric } from '../src/prisma/errors.js';
import { db } from '../src/prisma/db.js';
import { requireDevMode } from './require-dev-mode.js';

const DEFAULT_COMPANY_ACCOUNT = {
  name: 'Primary collections',
  bankName: 'Default bank',
  accountNumber: 'MWANGA-PRIMARY',
  currency: 'CDF',
} as const;

const DEFAULT_REVENUE_ACCOUNT = {
  code: 'swap_fees',
  name: 'Swap fees',
  currency: 'CDF',
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
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
