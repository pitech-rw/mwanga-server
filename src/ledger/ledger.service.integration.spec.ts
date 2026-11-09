import 'dotenv/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';
import { asNumeric } from '../prisma/errors.js';
import { db } from '../prisma/db.js';
import { LedgerService } from './ledger.service.js';
import { PrismaService } from '../prisma.service.js';

describe('LedgerService (integration)', { timeout: 60_000 }, () => {
  const prisma = { db } as PrismaService;
  const ledger = new LedgerService(prisma);

  let walletId: number;
  let companyAccountId: number;
  const refPrefix = `test-${Date.now()}`;

  beforeAll(async () => {
    await db.connect({ url: process.env['DATABASE_URL']! });

    const owner = await db.orm.public.Owner.orderBy((o) => o.id.asc()).first();
    if (!owner) {
      throw new Error('Integration test requires at least one Owner row');
    }

    let wallet = await db.orm.public.Wallet.where({ ownerId: owner.id }).first();
    if (!wallet) {
      wallet = await db.orm.public.Wallet.create({
        ownerId: owner.id,
        balance: asNumeric(0),
        currency: 'CDF',
      });
    }
    walletId = wallet.id;

    const company =
      (await db.orm.public.CompanyAccount.where({ accountNumber: 'MWANGA-PRIMARY' }).first()) ??
      (await db.orm.public.CompanyAccount.create({
        name: 'Test collections',
        accountNumber: `TEST-CO-${refPrefix}`,
        currency: 'CDF',
        balance: asNumeric(0),
      }));
    companyAccountId = company.id;

    const revenue = await db.orm.public.RevenueAccount.where({ code: 'swap_fees' }).first();
    if (!revenue) {
      throw new Error('Run npm run seed:ledger-accounts before integration tests');
    }
  });


  it('credits float via double-entry and updates balances', async () => {
    const beforeWallet = await db.orm.public.Wallet.first({ id: walletId });
    const beforeCompany = await db.orm.public.CompanyAccount.first({ id: companyAccountId });
    if (!beforeWallet || !beforeCompany) {
      throw new Error('Missing test fixtures');
    }

    const amount = 123.45;
    const externalReference = `${refPrefix}-float-1`;

    await db.transaction(async (tx) => {
      await ledger.creditFloatInTx(tx, {
        walletId,
        companyAccountId,
        amount,
        externalReference,
        description: 'integration test top-up',
      });
    });

    const afterWallet = await db.orm.public.Wallet.first({ id: walletId });
    const afterCompany = await db.orm.public.CompanyAccount.first({ id: companyAccountId });
    if (!afterWallet || !afterCompany) {
      throw new Error('Missing wallets after credit');
    }

    expect(Number(afterWallet.balance)).toBeCloseTo(Number(beforeWallet.balance) + amount, 2);
    expect(Number(afterCompany.balance)).toBeCloseTo(Number(beforeCompany.balance) + amount, 2);
  });

  it('rejects duplicate externalReference', async () => {
    const externalReference = `${refPrefix}-float-dup`;

    await db.transaction(async (tx) => {
      await ledger.creditFloatInTx(tx, {
        walletId,
        companyAccountId,
        amount: 10,
        externalReference,
      });
    });

    let duplicateError: unknown;
    try {
      await db.transaction(async (tx) => {
        await ledger.creditFloatInTx(tx, {
          walletId,
          companyAccountId,
          amount: 10,
          externalReference,
        });
      });
    } catch (error) {
      duplicateError = error;
    }

    expect(duplicateError).toBeInstanceOf(ConflictException);
  });

  it('rolls back swap fee when wallet balance is insufficient', async () => {
    const wallet = await db.orm.public.Wallet.first({ id: walletId });
    if (!wallet) {
      throw new Error('Wallet missing');
    }

    const hugeFee = Number(wallet.balance) + 10_000;

    await expect(
      db.transaction(async (tx) => {
        await ledger.captureSwapFeeInTx(tx, {
          walletId,
          amount: hugeFee,
          swapTransactionId: 1,
        });
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const unchanged = await db.orm.public.Wallet.first({ id: walletId });
    expect(Number(unchanged?.balance)).toBe(Number(wallet.balance));
  });
});
