import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(): Promise<CompanyAccount[]> {
    return this.prisma.db.orm.public.CompanyAccount.orderBy((row) => row.name.asc()).all();
  }

  async findOne(id: number): Promise<CompanyAccount> {
    const account = await this.prisma.db.orm.public.CompanyAccount.first({ id });
    if (!account) {
      throw new NotFoundException(`Company account with id ${id} not found`);
    }
    return account;
  }

  async listLedgerTransactions(id: number): Promise<LedgerTransaction[]> {
    await this.findOne(id);
    return this.ledger.listTransactionsForCompanyAccount(id);
  }

  async create(data: CreateCompanyAccountDto): Promise<CompanyAccount> {
    try {
      return await this.prisma.db.orm.public.CompanyAccount.create({
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        currency: data.currency ?? 'CDF',
        balance: asNumeric(0),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A company account with this account number already exists');
      }
      throw error;
    }
  }
}
