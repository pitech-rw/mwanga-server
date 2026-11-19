import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { apiBadRequest } from '../errors/api-error.js';
import { AgentsCodes } from '../errors/codes.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { agentReadScope, denyOrNotFoundForScopedRead } from '../auth/read-scope.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Agent, LedgerTransaction, SafeUser } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import type { AgentTopUpDto } from './agent-top-up.dto.js';
import { assertUserActiveForAssignment } from '../users/assert-user-active.js';
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
          currency: data.currency ?? DEFAULT_CURRENCY,
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
        apiBadRequest(AgentsCodes.duplicateAgent);
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
        apiBadRequest(AgentsCodes.duplicatePortalUser);
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

  async findTopUpTarget(query: string): Promise<TopUpTarget> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      apiBadRequest(AgentsCodes.searchTooShort);
    }

    try {
      return await this.findTopUpTargetByPhone(trimmed);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    return this.findTopUpTargetByName(trimmed);
  }

  private normalizeLookupName(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private riderDisplayName(user: {
    firstName: string | null;
    lastName: string | null;
    username: string;
  }): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.username;
  }

  private async findTopUpTargetByPhone(phone: string): Promise<TopUpTarget> {
    const user = await this.prisma.db.orm.public.User.first({ phone });

    if (user?.type === 'rider') {
      const wallet = await this.prisma.db.orm.public.Wallet.first({ userId: user.id });
      if (!wallet) {
        throw new NotFoundException('Rider wallet not found');
      }
      return { kind: 'rider', name: this.riderDisplayName(user), walletId: wallet.id };
    }

    if (user?.type === 'owner') {
      const owner = await this.prisma.db.orm.public.Owner.first({ userId: user.id });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
      return this.ownerTarget(owner.id, owner.name);
    }

    const owner = await this.prisma.db.orm.public.Owner.first({ phone });
    if (!owner) {
      throw new NotFoundException('No rider or owner matches that phone');
    }

    return this.ownerTarget(owner.id, owner.name);
  }

  private async findTopUpTargetByName(raw: string): Promise<TopUpTarget> {
    const needle = this.normalizeLookupName(raw);

    const [riders, owners] = await Promise.all([
      this.prisma.db.orm.public.User.include('riderWallet').where({ type: 'rider' }).all(),
      this.prisma.db.orm.public.Owner.include('wallet').all(),
    ]);

    type Candidate = { kind: 'rider' | 'owner'; name: string; walletId: number; exact: boolean };
    const candidates: Candidate[] = [];

    for (const user of riders) {
      const wallet = user.riderWallet;
      if (!wallet) {
        continue;
      }
      const name = this.riderDisplayName(user);
      const normalized = this.normalizeLookupName(name);
      const exact = normalized === needle;
      const partial = !exact && normalized.includes(needle);
      if (exact || partial) {
        candidates.push({ kind: 'rider', name, walletId: wallet.id, exact });
      }
    }

    for (const owner of owners) {
      const wallet = owner.wallet;
      if (!wallet) {
        continue;
      }
      const normalized = this.normalizeLookupName(owner.name);
      const exact = normalized === needle;
      const partial = !exact && normalized.includes(needle);
      if (exact || partial) {
        candidates.push({ kind: 'owner', name: owner.name, walletId: wallet.id, exact });
      }
    }

    const exactMatches = candidates.filter((candidate) => candidate.exact);
    if (exactMatches.length === 1) {
      const match = exactMatches[0]!;
      return { kind: match.kind, name: match.name, walletId: match.walletId };
    }
    if (exactMatches.length > 1) {
      apiBadRequest(AgentsCodes.multipleNameMatches);
    }

    const partialMatches = candidates.filter((candidate) => !candidate.exact);
    if (partialMatches.length === 1) {
      const match = partialMatches[0]!;
      return { kind: match.kind, name: match.name, walletId: match.walletId };
    }
    if (partialMatches.length > 1) {
      apiBadRequest(AgentsCodes.multipleNameMatchesNarrow);
    }

    throw new NotFoundException('No rider or owner matches that phone or name');
  }

  async listMyTransactions(actorUserId: number): Promise<LedgerTransaction[]> {
    return this.ledger.listTransactionsForActor(actorUserId, { kind: 'agent_topup' });
  }

  async topUp(actorUserId: number, dto: AgentTopUpDto): Promise<LedgerTransaction> {
    const agent = await this.prisma.db.orm.public.Agent.include('wallet').first({ userId: actorUserId });
    if (!agent?.wallet) {
      apiBadRequest(AgentsCodes.floatWalletMissing);
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

  private async assertPortalUser(userId: number): Promise<SafeUser> {
    const user = await this.prisma.db.orm.public.User.first({ id: userId });
    if (!user) {
      apiBadRequest(AgentsCodes.userNotFound, { params: { userId } });
    }
    if (user.type !== 'agent') {
      apiBadRequest(AgentsCodes.linkedMustBeAgent);
    }
    if (user.ownerId != null) {
      apiBadRequest(AgentsCodes.portalNoOwnerId);
    }
    await assertUserActiveForAssignment(this.prisma, userId);
    const existingAgent = await this.prisma.db.orm.public.Agent.first({ userId });
    if (existingAgent) {
      apiBadRequest(AgentsCodes.profileExists);
    }
    return user;
  }
}
