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
import type { Owner } from '../prisma/types.js';
import { CreateOwnerDto } from './create-owner.dto.js';
import { UpdateOwnerDto } from './update-owner.dto.js';
import { OwnersService } from './owners.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Owners')
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.owners.read)
  @ApiOperation({ summary: 'List fleet owners' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Owner[]> {
    return this.ownersService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.owners.read)
  @ApiOperation({ summary: 'Get owner by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Owner> {
    return this.ownersService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.owners.write)
  @ApiOperation({ summary: 'Create owner with wallet' })
  @ApiCreatedResponse({ description: 'Created owner' })
  create(@Body() createOwnerDto: CreateOwnerDto): Promise<Owner> {
    return this.ownersService.create(createOwnerDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.owners.write)
  @ApiOperation({ summary: 'Update owner' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOwnerDto: UpdateOwnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Owner> {
    return this.ownersService.update(id, updateOwnerDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.owners.delete)
  @ApiOperation({ summary: 'Delete owner' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted owner' })
  @ApiNotFoundResponse({ description: 'Owner not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Owner> {
    return this.ownersService.remove(id, this.readCtx(user));
  }
}
