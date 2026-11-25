import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { CompanyAccount, LedgerTransaction } from '../prisma/types.js';
import { CompanyFloatCreditDto } from './company-float-credit.dto.js';
import { CompanyAccountsService } from './company-accounts.service.js';
import { CreateCompanyAccountDto } from './create-company-account.dto.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Company accounts')
@Controller('company-accounts')
export class CompanyAccountsController {
  constructor(private readonly companyAccountsService: CompanyAccountsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.companyAccounts.read)
  @ApiOperation({ summary: 'List company bank accounts' })
  @ApiOkResponse({ description: 'Company accounts' })
  findAll(): Promise<CompanyAccount[]> {
    return this.companyAccountsService.findAll();
  }

  @Get(':id/transactions')
  @RequirePermissions(PERMISSIONS.companyAccounts.read)
  @ApiOperation({ summary: 'List ledger transactions for a company account' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Immutable ledger transactions' })
  listTransactions(@Param('id', ParseIntPipe) id: number): Promise<LedgerTransaction[]> {
    return this.companyAccountsService.listLedgerTransactions(id);
  }

  @Post(':id/float-credit')
  @RequirePermissions(PERMISSIONS.companyAccounts.credit)
  @ApiOperation({ summary: 'Credit company float from a verified bank transfer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({ description: 'Ledger transaction (double-entry)' })
  floatCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompanyFloatCreditDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LedgerTransaction> {
    return this.companyAccountsService.creditFloat(id, dto, user.sub);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.companyAccounts.read)
  @ApiOperation({ summary: 'Get company account by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Company account' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CompanyAccount> {
    return this.companyAccountsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.companyAccounts.write)
  @ApiOperation({ summary: 'Create a company bank account' })
  @ApiCreatedResponse({ description: 'Created company account' })
  create(@Body() dto: CreateCompanyAccountDto): Promise<CompanyAccount> {
    return this.companyAccountsService.create(dto);
  }
}
