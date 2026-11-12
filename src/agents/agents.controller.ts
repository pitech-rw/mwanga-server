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
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import type { Agent, LedgerTransaction } from '../prisma/types.js';
import { AgentTopUpDto, TopUpTargetQueryDto } from './agent-top-up.dto.js';
import { AgentsService, type TopUpTarget } from './agents.service.js';
import { CreateAgentDto } from './create-agent.dto.js';
import { UpdateAgentDto } from './update-agent.dto.js';

@ApiBearerAuth('JWT-auth')
@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  private readCtx(user: AuthenticatedUser): ReadScopeContext {
    return { user, isAdminBypass: user.adminBypass };
  }

  @Get('top-up-targets')
  @RequirePermissions(PERMISSIONS.wallets.agentTopup)
  @ApiOperation({ summary: 'Find a rider or owner wallet by exact phone' })
  findTopUpTarget(@Query() query: TopUpTargetQueryDto): Promise<TopUpTarget> {
    return this.agentsService.findTopUpTarget(query.phone);
  }

  @Post('top-ups')
  @RequirePermissions(PERMISSIONS.wallets.agentTopup)
  @ApiOperation({ summary: 'Move agent float into a rider or owner wallet' })
  @ApiCreatedResponse({ description: 'Ledger transaction (double-entry)' })
  topUp(
    @Body() dto: AgentTopUpDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LedgerTransaction> {
    return this.agentsService.topUp(user.sub, dto);
  }

  @Get('me/transactions')
  @RequirePermissions(PERMISSIONS.wallets.read)
  @ApiOperation({ summary: 'Ledger entries for top-ups performed by the signed-in agent' })
  @ApiOkResponse({ description: 'Agent top-up transactions (newest first)' })
  listMyTransactions(@CurrentUser() user: AuthenticatedUser): Promise<LedgerTransaction[]> {
    return this.agentsService.listMyTransactions(user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.agents.read)
  @ApiOperation({ summary: 'List agents' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Agent[]> {
    return this.agentsService.findAll(this.readCtx(user));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.agents.read)
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Agent> {
    return this.agentsService.findOne(id, this.readCtx(user));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.agents.write)
  @ApiOperation({ summary: 'Link an existing agent user account and create float wallet' })
  @ApiCreatedResponse({ description: 'Created agent' })
  create(@Body() createAgentDto: CreateAgentDto): Promise<Agent> {
    return this.agentsService.create(createAgentDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.agents.write)
  @ApiOperation({ summary: 'Update agent' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Agent> {
    return this.agentsService.update(id, updateAgentDto, this.readCtx(user));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.agents.delete)
  @ApiOperation({ summary: 'Delete agent' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Deleted agent' })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<Agent> {
    return this.agentsService.remove(id, this.readCtx(user));
  }
}
