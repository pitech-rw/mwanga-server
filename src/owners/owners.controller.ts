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

  @Get()
  @RequirePermissions(PERMISSIONS.owners.read)
  @ApiOperation({ summary: 'List all fleet owners' })
  @ApiOkResponse({ description: 'All owners' })
  findAll(): Promise<Owner[]> {
    return this.ownersService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.owners.read)
  @ApiOperation({ summary: 'Get owner by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Owner record' })
  @ApiNotFoundResponse({ description: 'Owner not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Owner> {
    return this.ownersService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.owners.write)
  @ApiOperation({ summary: 'Create an owner' })
  @ApiCreatedResponse({ description: 'Created owner' })
  create(@Body() createOwnerDto: CreateOwnerDto): Promise<Owner> {
    return this.ownersService.create(createOwnerDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.owners.write)
  @ApiOperation({ summary: 'Update an owner' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated owner' })
  @ApiNotFoundResponse({ description: 'Owner not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOwnerDto: UpdateOwnerDto,
  ): Promise<Owner> {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.owners.delete)
  @ApiOperation({ summary: 'Delete an owner' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted owner' })
  @ApiNotFoundResponse({ description: 'Owner not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Owner> {
    return this.ownersService.remove(id);
  }
}
