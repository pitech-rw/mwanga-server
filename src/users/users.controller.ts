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
  findAll(@Query() query: ListUsersQueryDto): Promise<SafeUser[]> {
    return this.usersService.findAll(
      query.type !== undefined ? { type: query.type as UserType } : undefined,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.users.read)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'User record' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.usersService.findOne(id);
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
  ): Promise<SafeUser> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.users.delete)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.usersService.remove(id);
  }
}
