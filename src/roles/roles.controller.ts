import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { CreateRoleDto } from './create-role.dto.js';
import type { RoleWithPermissions } from './role-with-permissions.js';
import { SetRolePermissionsDto } from './set-role-permissions.dto.js';
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
  @ApiOkResponse({ description: 'All roles with permission strings' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<RoleWithPermissions[]> {
    return this.rolesService.findAll(this.readCtx(user));
  }

  @Get('permission-catalog')
  @RequirePermissions(PERMISSIONS.roles.read)
  @ApiOperation({ summary: 'Assignable permission strings for role matrix' })
  @ApiOkResponse({ description: 'Known permissions grouped by resource prefix' })
  permissionCatalog() {
    return this.rolesService.getPermissionCatalog();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.roles.read)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Role record with permissions' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<RoleWithPermissions> {
    return this.rolesService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.roles.write)
  @ApiOperation({ summary: 'Create a role' })
  @ApiCreatedResponse({ description: 'Created role' })
  create(@Body() createRoleDto: CreateRoleDto): Promise<RoleWithPermissions> {
    return this.rolesService.create(createRoleDto);
  }

  @Put(':id/permissions')
  @RequirePermissions(PERMISSIONS.roles.write)
  @ApiOperation({ summary: 'Replace role permission set' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Role with updated permissions' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return this.rolesService.setPermissions(id, body, this.readCtx(user));
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
  ): Promise<RoleWithPermissions> {
    return this.rolesService.update(id, updateRoleDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.roles.delete)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted role' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<RoleWithPermissions> {
    return this.rolesService.remove(id, this.readCtx(user));
  }
}