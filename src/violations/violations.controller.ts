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
import type { Violation } from '../prisma/types.js';
import { CreateViolationDto } from './create-violation.dto.js';
import { UpdateViolationDto } from './update-violation.dto.js';
import { ViolationsService } from './violations.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Violations')
@Controller('violations')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.violations.read)
  @ApiOperation({ summary: 'List all violations' })
  @ApiOkResponse({ description: 'All violations' })
  findAll() {
    return this.violationsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.violations.read)
  @ApiOperation({ summary: 'Get violation by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Violation record' })
  @ApiNotFoundResponse({ description: 'Violation not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.violationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.violations.write)
  @ApiOperation({ summary: 'Create a violation' })
  @ApiCreatedResponse({ description: 'Created violation' })
  create(@Body() createViolationDto: CreateViolationDto): Promise<Violation> {
    return this.violationsService.create(createViolationDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.violations.write)
  @ApiOperation({ summary: 'Update a violation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Updated violation' })
  @ApiNotFoundResponse({ description: 'Violation not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateViolationDto: UpdateViolationDto,
  ): Promise<Violation> {
    return this.violationsService.update(id, updateViolationDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.violations.delete)
  @ApiOperation({ summary: 'Delete a violation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted violation' })
  @ApiNotFoundResponse({ description: 'Violation not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Violation> {
    return this.violationsService.remove(id);
  }
}
