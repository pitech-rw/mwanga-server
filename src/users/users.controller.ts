import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { PERMISSIONS, USER_TYPE_NAMES } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { SafeUser, UserType } from '../prisma/types.js';
import { CreateUserDto } from './create-user.dto.js';
import { ListUsersQueryDto } from './list-users-query.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { UsersService } from './users.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get('riders')
  @RequirePermissions(PERMISSIONS.riders.read)
  @ApiOperation({ summary: 'List riders and fleet owners (field agents)' })
  @ApiOkResponse({ description: 'Rider users and fleet Owner records for top-up lookup' })
  findRiders(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    return this.usersService.findRidersForAgent(this.readCtx(user));
  }

  @Get()
  @RequirePermissions(PERMISSIONS.users.read)
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: USER_TYPE_NAMES,
    description: 'Filter by user type (e.g. rider)',
  })
  @ApiOkResponse({ description: 'Users matching the filter, or all users when type is omitted' })
  findAll(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser[]> {
    return this.usersService.findAll(
      this.readCtx(user),
      query.type !== undefined ? { type: query.type as UserType } : undefined,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.users.read)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'User record' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<SafeUser> {
    return this.usersService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.users.write)
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'Created user' })
  create(@Body() createUserDto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.users.write)
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.update(id, updateUserDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.users.delete)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<SafeUser> {
    return this.usersService.remove(id, this.readCtx(user));
  }
}
