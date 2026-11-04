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
import type { Rider } from '../prisma/types.js';
import { CreateRiderDto } from './create-rider.dto.js';
import { UpdateRiderDto } from './update-rider.dto.js';
import { RidersService } from './riders.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.riders.read)
  @ApiOperation({ summary: 'List all riders' })
  @ApiOkResponse({ description: 'All riders' })
  findAll(): Promise<Rider[]> {
    return this.ridersService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.riders.read)
  @ApiOperation({ summary: 'Get rider by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Rider record' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.riders.write)
  @ApiOperation({ summary: 'Create a rider' })
  @ApiCreatedResponse({ description: 'Created rider' })
  create(@Body() createRiderDto: CreateRiderDto): Promise<Rider> {
    return this.ridersService.create(createRiderDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.riders.write)
  @ApiOperation({ summary: 'Update a rider' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated rider' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRiderDto: UpdateRiderDto,
  ): Promise<Rider> {
    return this.ridersService.update(id, updateRiderDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.riders.delete)
  @ApiOperation({ summary: 'Delete a rider' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted rider' })
  @ApiNotFoundResponse({ description: 'Rider not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Rider> {
    return this.ridersService.remove(id);
  }
}
