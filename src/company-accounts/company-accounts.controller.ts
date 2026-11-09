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
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { CompanyAccount } from '../prisma/types.js';
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
