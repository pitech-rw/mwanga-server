import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { apiBadRequest } from '../errors/api-error.js';
import { ErasureCodes } from '../errors/codes.js';
import { presentSafeUser } from './present-safe-user.js';
import { PrismaService } from '../prisma.service.js';
import type { User, UserType } from '../prisma/types.js';
import {
  SELF_CONFIRM_ERASURE_USER_TYPES,
  STAFF_ERASURE_USER_TYPES,
} from './erasure.constants.js';
import { UserErasureService, type ErasurePreconditionOptions } from './user-erasure.service.js';

export type ErasureRequestRow = {
  id: number;
  userId: number;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  approvedById: number | null;
  completedAt: Date | null;
  reason: string | null;
  user?: ReturnType<typeof presentSafeUser>;
};

@Injectable()
export class ErasureRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userErasure: UserErasureService,
  ) {}

  private async activeRequestForUser(userId: number) {
    const rows = await this.prisma.db.orm.public.ErasureRequest.where({ userId })
      .orderBy((row) => row.requestedAt.desc())
      .all();
    const activeStatuses = new Set(['pending', 'pending_approval', 'approved']);
    return rows.find((row) => activeStatuses.has(row.status)) ?? null;
  }

  async createRequest(actor: AuthenticatedUser, reason?: string): Promise<ErasureRequestRow> {
    const user = await this.prisma.db.orm.public.User.first({ id: actor.sub });

    if (!user) {
      throw new NotFoundException(`User with id ${actor.sub} not found`);
    }

    if (user.erasedAt != null) {
      apiBadRequest(ErasureCodes.alreadyErased);
    }

    const existing = await this.activeRequestForUser(actor.sub);
    if (existing) {
      apiBadRequest(ErasureCodes.activeRequestExists);
    }

    const type = user.type as UserType;
    const status = STAFF_ERASURE_USER_TYPES.has(type) ? 'pending_approval' : 'pending';

    const created = await this.prisma.db.orm.public.ErasureRequest.create({
      userId: actor.sub,
      status,
      reason: reason?.trim() || null,
    });

    return this.toDto(created.id);
  }

  async confirmSelfService(
    actor: AuthenticatedUser,
    password: string,
    options?: ErasurePreconditionOptions,
  ): Promise<void> {
    const user = await this.prisma.db.orm.public.User.first({ id: actor.sub });

    if (!user) {
      throw new NotFoundException(`User with id ${actor.sub} not found`);
    }

    if (!SELF_CONFIRM_ERASURE_USER_TYPES.has(user.type as UserType)) {
      apiBadRequest(ErasureCodes.staffRequiresApproval);
    }

    let request = await this.prisma.db.orm.public.ErasureRequest.where({ userId: actor.sub })
      .orderBy((row) => row.requestedAt.desc())
      .first({ status: 'pending' });

    if (!request) {
      const blocking = await this.activeRequestForUser(actor.sub);
      if (blocking) {
        apiBadRequest(ErasureCodes.requestNotConfirmable);
      }
      request = await this.prisma.db.orm.public.ErasureRequest.create({
        userId: actor.sub,
        status: 'pending',
        reason: null,
      });
    }

    await this.userErasure.verifyPasswordForErasure(actor.sub, password);
    await this.userErasure.executeErasure(actor.sub, options);

    await this.prisma.db.orm.public.ErasureRequest.where({ id: request.id }).update({
      status: 'completed',
      completedAt: new Date(),
    });
  }

  async listPendingForAdmin(): Promise<ErasureRequestRow[]> {
    const rows = await this.prisma.db.orm.public.ErasureRequest.include('user')
      .where({ status: 'pending_approval' })
      .orderBy((row) => row.requestedAt.asc())
      .all();

    return rows.map((row) => this.mapRow(row));
  }

  async approve(requestId: number, approver: AuthenticatedUser): Promise<ErasureRequestRow> {
    const request = await this.prisma.db.orm.public.ErasureRequest.include('user').first({
      id: requestId,
    });

    if (!request) {
      apiBadRequest(ErasureCodes.requestNotFound);
    }

    if (request.status !== 'pending_approval') {
      apiBadRequest(ErasureCodes.requestNotConfirmable);
    }

    if (request.userId === approver.sub) {
      apiBadRequest(ErasureCodes.cannotApproveOwnErasure);
    }

    await this.userErasure.executeErasure(request.userId);

    const now = new Date();
    await this.prisma.db.orm.public.ErasureRequest.where({ id: requestId }).update({
      status: 'completed',
      approvedById: approver.sub,
      approvedAt: now,
      completedAt: now,
    });

    return this.toDto(requestId);
  }

  async reject(requestId: number, approver: AuthenticatedUser): Promise<ErasureRequestRow> {
    const request = await this.prisma.db.orm.public.ErasureRequest.first({ id: requestId });

    if (!request) {
      apiBadRequest(ErasureCodes.requestNotFound);
    }

    if (request.status !== 'pending_approval') {
      apiBadRequest(ErasureCodes.requestNotConfirmable);
    }

    await this.prisma.db.orm.public.ErasureRequest.where({ id: requestId }).update({
      status: 'rejected',
      approvedById: approver.sub,
      approvedAt: new Date(),
    });

    return this.toDto(requestId);
  }

  async getLatestForUser(userId: number): Promise<ErasureRequestRow | null> {
    const request = await this.prisma.db.orm.public.ErasureRequest.where({ userId })
      .orderBy((row) => row.requestedAt.desc())
      .first();

    return request ? this.toDto(request.id) : null;
  }

  private async toDto(requestId: number): Promise<ErasureRequestRow> {
    const row = await this.prisma.db.orm.public.ErasureRequest.include('user').first({
      id: requestId,
    });

    if (!row) {
      apiBadRequest(ErasureCodes.requestNotFound);
    }

    return this.mapRow(row);
  }

  private mapRow(row: {
    id: number;
    userId: number;
    status: string;
    requestedAt: Date;
    approvedAt: Date | null;
    approvedById: number | null;
    completedAt: Date | null;
    reason: string | null;
    user?: User | null;
  }): ErasureRequestRow {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      requestedAt: row.requestedAt,
      approvedAt: row.approvedAt,
      approvedById: row.approvedById,
      completedAt: row.completedAt,
      reason: row.reason,
      user: row.user ? presentSafeUser(row.user) : undefined,
    };
  }
}