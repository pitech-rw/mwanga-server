import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import { ErasureRequestService } from './erasure-request.service.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Admin')
@Controller('admin/erasure-requests')
export class ErasureAdminController {
  constructor(private readonly erasureRequests: ErasureRequestService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.system.admin)
  @ApiOperation({ summary: 'List erasure requests awaiting admin approval' })
  @ApiOkResponse({ description: 'Pending staff erasure requests' })
  listPending() {
    return this.erasureRequests.listPendingForAdmin();
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.system.admin)
  @ApiOperation({ summary: 'Approve and execute a staff erasure request' })
  @ApiParam({ name: 'id', type: Number })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.erasureRequests.approve(id, user);
  }

  @Post(':id/reject')
  @RequirePermissions(PERMISSIONS.system.admin)
  @ApiOperation({ summary: 'Reject a staff erasure request' })
  @ApiParam({ name: 'id', type: Number })
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.erasureRequests.reject(id, user);
  }
}