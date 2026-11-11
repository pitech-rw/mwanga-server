import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { agentReadScope, denyOrNotFoundForScopedRead } from '../auth/read-scope.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Agent, LedgerTransaction } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import type { AgentTopUpDto } from './agent-top-up.dto.js';
import { CreateAgentDto } from './create-agent.dto.js';
import { UpdateAgentDto } from './update-agent.dto.js';

export type TopUpTarget = {
  kind: 'rider' | 'owner';
  name: string;
  walletId: number;
};

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private agentQuery() {
    return this.prisma.db.orm.public.Agent.include('portalUser').include('wallet');
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = agentReadScope(ctx);
    const ordered = this.agentQuery().orderBy((agent) => agent.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    return ordered.where({ userId: scope.userId }).all();
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const agent = await this.agentQuery().first({ id });

    if (!agent) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    const scope = agentReadScope(ctx);
    if (scope.mode === 'self' && agent.userId !== scope.userId) {
      denyOrNotFoundForScopedRead(ctx, 'not_owner');
    }

    return agent;
  }

  async create(data: CreateAgentDto): Promise<Agent> {
    const portalUser = await this.assertPortalUser(data.userId);
    const displayName =
      [portalUser.firstName, portalUser.lastName].filter(Boolean).join(' ').trim() ||
      portalUser.username;

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const agent = await tx.orm.public.Agent.include('portalUser').include('wallet').create({
          name: displayName,
          email: portalUser.email,
          phone: portalUser.phone,
          status: data.status ?? 'active',
          userId: data.userId,
        });

        await tx.orm.public.Wallet.create({
          agentId: agent.id,
          balance: asNumeric(0),
          currency: data.currency ?? 'CDF',
        });

        const loaded = await tx.orm.public.Agent.include('portalUser').include('wallet').first({
          id: agent.id,
        });

        if (!loaded) {
          throw new NotFoundException(`Agent with id ${agent.id} not found`);
        }

        return loaded;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An agent with this portal user or wallet already exists');
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateAgentDto, ctx: ReadScopeContext): Promise<Agent> {
    await this.findOne(id, ctx);

    if (data.userId !== undefined && data.userId != null) {
      await this.assertPortalUser(data.userId);
    }

    try {
      const agent = await this.agentQuery()
        .where({ id })
        .update(
          withoutUndefined({
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            userId: data.userId,
          }),
        );

      if (!agent) {
        throw new NotFoundException(`Agent with id ${id} not found`);
      }

      return agent;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An agent with this portal user already exists');
      }
      throw error;
    }
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<Agent> {
    await this.findOne(id, ctx);

    const agent = await this.prisma.db.orm.public.Agent.where({ id }).delete();

    if (!agent) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    return agent;
  }

  async findTopUpTarget(phone: string): Promise<TopUpTarget> {
    const trimmed = phone.trim();
    const user = await this.prisma.db.orm.public.User.first({ phone: trimmed });

    if (user?.type === 'rider') {
      const wallet = await this.prisma.db.orm.public.Wallet.first({ userId: user.id });
      if (!wallet) {
        throw new NotFoundException('Rider wallet not found');
      }
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      return { kind: 'rider', name: name || user.username, walletId: wallet.id };
    }

    if (user?.type === 'owner') {
      const owner = await this.prisma.db.orm.public.Owner.first({ userId: user.id });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
      return this.ownerTarget(owner.id, owner.name);
    }

    const owner = await this.prisma.db.orm.public.Owner.first({ phone: trimmed });
    if (!owner) {
      throw new NotFoundException('No rider or owner matches that phone');
    }

    return this.ownerTarget(owner.id, owner.name);
  }

  async topUp(actorUserId: number, dto: AgentTopUpDto): Promise<LedgerTransaction> {
    const agent = await this.prisma.db.orm.public.Agent.include('wallet').first({ userId: actorUserId });
    if (!agent?.wallet) {
      throw new BadRequestException('Agent float wallet is not set up');
    }

    return this.prisma.db.transaction((tx) =>
      this.ledger.transferAgentFloatInTx(tx, {
        agentWalletId: agent.wallet!.id,
        targetWalletId: dto.walletId,
        amount: dto.amount,
        externalReference: dto.externalReference,
        actorUserId,
        description: dto.description,
      }),
    );
  }

  private async ownerTarget(ownerId: number, name: string): Promise<TopUpTarget> {
    const wallet = await this.prisma.db.orm.public.Wallet.first({ ownerId });
    if (!wallet) {
      throw new NotFoundException('Owner wallet not found');
    }
    return { kind: 'owner', name, walletId: wallet.id };
  }

  private async assertPortalUser(userId: number) {
    const user = await this.prisma.db.orm.public.User.first({ id: userId });
    if (!user) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }
    if (user.type !== 'agent') {
      throw new BadRequestException('Linked account must have type agent');
    }
    if (user.ownerId != null) {
      throw new BadRequestException('Agent portal users must not have ownerId set');
    }
    const existingAgent = await this.prisma.db.orm.public.Agent.first({ userId });
    if (existingAgent) {
      throw new BadRequestException('This user already has an agent profile');
    }
    return user;
  }
}
