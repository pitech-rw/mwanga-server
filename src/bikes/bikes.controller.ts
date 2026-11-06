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
import type { Bike } from '../prisma/types.js';
import { BikesService } from './bikes.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Bikes')
@Controller('bikes')
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.bikes.read)
  @ApiOperation({ summary: 'List all bikes' })
  @ApiOkResponse({ description: 'All bikes' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Bike[]> {
    return this.bikesService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.bikes.read)
  @ApiOperation({ summary: 'Get bike by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Bike record' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Bike> {
    return this.bikesService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bikes.write)
  @ApiOperation({ summary: 'Create a bike' })
  @ApiCreatedResponse({ description: 'Created bike' })
  create(@Body() createBikeDto: CreateBikeDto): Promise<Bike> {
    return this.bikesService.create(createBikeDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.bikes.write)
  @ApiOperation({ summary: 'Update a bike' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated bike' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBikeDto: UpdateBikeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Bike> {
    return this.bikesService.update(id, updateBikeDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.bikes.delete)
  @ApiOperation({ summary: 'Delete a bike' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted bike' })
  @ApiNotFoundResponse({ description: 'Bike not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Bike> {
    return this.bikesService.remove(id, this.readCtx(user));
  }
}
