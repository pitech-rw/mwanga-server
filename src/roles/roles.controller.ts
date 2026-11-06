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
import type { Role } from '../prisma/types.js';
import { CreateRoleDto } from './create-role.dto.js';
import { UpdateRoleDto } from './update-role.dto.js';
import { RolesService } from './roles.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.roles.read)
  @ApiOperation({ summary: 'List all roles' })
  @ApiOkResponse({ description: 'All roles' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Role[]> {
    return this.rolesService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.roles.read)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Role record' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Role> {
    return this.rolesService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.roles.write)
  @ApiOperation({ summary: 'Create a role' })
  @ApiCreatedResponse({ description: 'Created role' })
  create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.roles.write)
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated role' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Role> {
    return this.rolesService.update(id, updateRoleDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.roles.delete)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted role' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Role> {
    return this.rolesService.remove(id, this.readCtx(user));
  }
}
