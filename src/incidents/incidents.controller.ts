import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
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
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../auth/require-permissions.decorator.js';
import { CreateIncidentDto } from './create-incident.dto.js';
import { DismissIncidentDto } from './dismiss-incident.dto.js';
import { IncidentsService } from './incidents.service.js';
import { PostIncidentMessageDto } from './post-incident-message.dto.js';
import type { IncidentDetail } from './incidents.service.js';
import type { Incident } from '../prisma/types.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.incidents.read)
  @ApiOperation({ summary: 'List battery incidents (scoped)' })
  @ApiOkResponse({ description: 'Incidents' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Incident[]> {
    return this.incidentsService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.incidents.read)
  @ApiOperation({ summary: 'Get incident with message thread' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Incident detail' })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentDetail> {
    return this.incidentsService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.incidents.write)
  @ApiOperation({ summary: 'Open a battery incident (swapper)' })
  @ApiCreatedResponse({ description: 'Created incident' })
  create(@Body() body: CreateIncidentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incidentsService.create(body, this.readCtx(user));
  }

  @Post(':id/messages')
  @RequireAnyPermission(PERMISSIONS.incidents.write, PERMISSIONS.incidents.review)
  @ApiOperation({ summary: 'Post a question (reviewer) or reply (swapper)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({ description: 'Updated incident with messages' })
  postMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostIncidentMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentsService.postMessage(id, body, this.readCtx(user));
  }

  @Post(':id/mark-damaged')
  @RequirePermissions(PERMISSIONS.incidents.review)
  @ApiOperation({ summary: 'Confirm damage — quarantine battery in warehouse' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Closed incident' })
  markDamaged(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.incidentsService.markDamaged(id, this.readCtx(user));
  }

  @Post(':id/dismiss')
  @RequirePermissions(PERMISSIONS.incidents.review)
  @ApiOperation({ summary: 'Dismiss incident without warehouse move' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Dismissed incident' })
  dismiss(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DismissIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentsService.dismiss(id, body, this.readCtx(user));
  }
}