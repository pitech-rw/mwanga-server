import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateWalletDto } from './create-wallet.dto.js';
import { UpdateWalletDto } from './update-wallet.dto.js';
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

  @Get(':id')
  @RequirePermissions(PERMISSIONS.wallets.read)
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Wallet record' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Wallet> {
    return this.walletsService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.wallets.write)
  @ApiOperation({ summary: 'Create a wallet for an owner' })
  @ApiCreatedResponse({ description: 'Created wallet' })
  create(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return this.walletsService.create(createWalletDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.wallets.write)
  @ApiOperation({ summary: 'Update a wallet' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated wallet' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWalletDto: UpdateWalletDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wallet> {
    return this.walletsService.update(id, updateWalletDto, this.readCtx(user));
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
