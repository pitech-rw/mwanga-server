import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { apiBadRequest } from '../errors/api-error.js';
import { CompanyAccountsCodes } from '../errors/codes.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric, isUniqueViolation } from '../prisma/errors.js';
import type { CompanyAccount, LedgerTransaction } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateCompanyAccountDto } from './create-company-account.dto.js';

@Injectable()
export class CompanyAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private presentCompanyAccount(account: CompanyAccount): CompanyAccount {
    return { ...account, currency: DEFAULT_CURRENCY };
  }

  async findAll(): Promise<CompanyAccount[]> {
    const rows = await this.prisma.db.orm.public.CompanyAccount.orderBy((row) => row.name.asc()).all();
    return rows.map((row) => this.presentCompanyAccount(row));
  }

  async findOne(id: number): Promise<CompanyAccount> {
    const account = await this.prisma.db.orm.public.CompanyAccount.first({ id });
    if (!account) {
      throw new NotFoundException(`Company account with id ${id} not found`);
    }
    return this.presentCompanyAccount(account);
  }

  async listLedgerTransactions(id: number): Promise<LedgerTransaction[]> {
    await this.findOne(id);
    return this.ledger.listTransactionsForCompanyAccount(id);
  }

  async create(data: CreateCompanyAccountDto): Promise<CompanyAccount> {
    try {
      const created = await this.prisma.db.orm.public.CompanyAccount.create({
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        currency: DEFAULT_CURRENCY,
        balance: asNumeric(0),
      });
      return this.presentCompanyAccount(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(CompanyAccountsCodes.duplicateAccount);
      }
      throw error;
    }
  }
}
