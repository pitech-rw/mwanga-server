import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
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
import type { ReadScopeContext } from '../auth/read-scope.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { Wallet } from '../prisma/types.js';
import type { LedgerTransaction } from '../prisma/types.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import { FloatCreditDto } from './float-credit.dto.js';
import { WalletsService } from './wallets.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.wallets.read)
  @ApiOperation({ summary: 'List fleet owner wallets' })
  @ApiOkResponse({ description: 'All wallets' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Wallet[]> {
    return this.walletsService.findAll(this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.wallets.write)
  @ApiOperation({ summary: 'Create a wallet for an owner' })
  @ApiCreatedResponse({ description: 'Created wallet' })
  create(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return this.walletsService.create(createWalletDto);
  }

  @Get(':id/transactions')
  @RequirePermissions(PERMISSIONS.wallets.read)
  @ApiOperation({ summary: 'List ledger transactions for a wallet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Immutable ledger transactions' })
  listTransactions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LedgerTransaction[]> {
    return this.walletsService.listLedgerTransactions(id, this.readCtx(user));
  }

  @Post(':id/float-credit')
  @RequirePermissions(PERMISSIONS.wallets.credit)
  @ApiOperation({ summary: 'Credit wallet float from a verified bank transfer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({ description: 'Ledger transaction (double-entry)' })
  floatCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FloatCreditDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LedgerTransaction> {
    return this.walletsService.floatCredit(id, dto, this.readCtx(user), user.sub);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.wallets.read)
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Wallet record' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Wallet> {
    return this.walletsService.findOne(id, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.wallets.delete)
  @ApiOperation({ summary: 'Delete a wallet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted wallet' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Wallet> {
    return this.walletsService.remove(id, this.readCtx(user));
  }
}
