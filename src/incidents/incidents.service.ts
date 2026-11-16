import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ReadScopeContext } from '../auth/read-scope.js';
import {
  denyOrNotFoundForScopedRead,
  incidentReadScope,
} from '../auth/read-scope.js';
import { PERMISSIONS } from '../auth/permission-catalog.js';
import { PermissionsService } from '../auth/permissions.service.js';
import { syncBatteryInventory } from '../inventory/inventory-lifecycle.js';
import { isUniqueViolation } from '../prisma/errors.js';
import type {
  Incident,
  IncidentMessage,
  IncidentMessageKind,
  IncidentStatus,
} from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateIncidentDto } from './create-incident.dto.js';
import { DismissIncidentDto } from './dismiss-incident.dto.js';
import { OPEN_INCIDENT_STATUSES } from './incident.constants.js';
import { PostIncidentMessageDto } from './post-incident-message.dto.js';

export type IncidentDetail = Incident & {
  messages: IncidentMessage[];
};

type Tx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private incidentQuery() {
    return this.prisma.db.orm.public.Incident.include('battery')
      .include('station')
      .include('reporter')
      .include('swapTransaction')
      .include('damagedBy')
      .include('dismissedBy');
  }

  private messageQuery() {
    return this.prisma.db.orm.public.IncidentMessage.include('author');
  }

  private mergeIncidentsById(rows: Incident[]): Incident[] {
    const byId = new Map<number, Incident>();
    for (const row of rows) {
      byId.set(row.id, row);
    }
    return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async rolePermissions(ctx: ReadScopeContext): Promise<Set<string>> {
    return this.permissionsService.getPermissionNamesForRole(ctx.user.roleId);
  }

  private async canReview(ctx: ReadScopeContext): Promise<boolean> {
    const perms = await this.rolePermissions(ctx);
    return (
      this.permissionsService.hasAdminBypass(perms) ||
      perms.has(PERMISSIONS.incidents.review)
    );
  }

  private async canWrite(ctx: ReadScopeContext): Promise<boolean> {
    const perms = await this.rolePermissions(ctx);
    return (
      this.permissionsService.hasAdminBypass(perms) ||
      perms.has(PERMISSIONS.incidents.write)
    );
  }

  async findAll(ctx: ReadScopeContext): Promise<Incident[]> {
    const scope = incidentReadScope(ctx);

    if (scope.mode === 'unrestricted') {
      return this.incidentQuery().orderBy((row) => row.createdAt.desc()).all();
    }

    const atStation = await this.incidentQuery().where({ stationId: scope.stationId }).all();
    const asReporter = await this.incidentQuery().where({ reporterId: scope.userId }).all();
    return this.mergeIncidentsById([...atStation, ...asReporter]);
  }

  async findOne(id: number, ctx: ReadScopeContext): Promise<IncidentDetail> {
    const incident = await this.incidentQuery().first({ id });

    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }

    await this.assertCanReadIncident(incident, ctx);

    const messages = await this.messageQuery()
      .where({ incidentId: id })
      .orderBy((row) => row.createdAt.asc())
      .all();

    return { ...incident, messages };
  }

  private async assertCanReadIncident(incident: Incident, ctx: ReadScopeContext): Promise<void> {
    const scope = incidentReadScope(ctx);
    if (scope.mode === 'unrestricted') {
      return;
    }

    const atTheirStation = incident.stationId === scope.stationId;
    const isReporter = incident.reporterId === scope.userId;
    if (!atTheirStation && !isReporter) {
      denyOrNotFoundForScopedRead(ctx, 'wrong_station');
    }
  }

  private assertTerminal(status: IncidentStatus): void {
    if (status === 'damaged' || status === 'dismissed') {
      throw new BadRequestException('This incident is already closed');
    }
  }

  private async generateTrackId(tx: Tx, stationId: number): Promise<string> {
    const station = await tx.orm.public.Station.first({ id: stationId });
    const code = (station?.code ?? 'ST').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `INC-${code}-${date}-${suffix}`;
  }

  async create(data: CreateIncidentDto, ctx: ReadScopeContext): Promise<IncidentDetail> {
    if (ctx.user.type !== 'swapper') {
      throw new ForbiddenException('Only swappers may open battery incidents');
    }
    if (ctx.user.stationId == null) {
      throw new ForbiddenException('Swapper is not assigned to a station');
    }
    if (!(await this.canWrite(ctx))) {
      throw new ForbiddenException('Insufficient permissions to create incidents');
    }

    const stationId = ctx.user.stationId;
    const reporterId = ctx.user.sub;

    const battery = await this.prisma.db.orm.public.Battery.first({ id: data.batteryId });
    if (!battery) {
      throw new BadRequestException(`Battery with id ${data.batteryId} not found`);
    }
    if (battery.stationId !== stationId) {
      throw new BadRequestException('Battery is not at your assigned station');
    }
    if (battery.status === 'faulty') {
      throw new BadRequestException('Battery is already marked faulty');
    }

    const openRows = await this.prisma.db.orm.public.Incident.where({
      batteryId: data.batteryId,
    }).all();
    const hasOpen = openRows.some((row) =>
      (OPEN_INCIDENT_STATUSES as readonly string[]).includes(row.status),
    );
    if (hasOpen) {
      throw new BadRequestException('An open incident already exists for this battery');
    }

    if (data.swapTransactionId != null) {
      const swap = await this.prisma.db.orm.public.SwapTransaction.first({
        id: data.swapTransactionId,
      });
      if (!swap) {
        throw new BadRequestException(`Swap transaction with id ${data.swapTransactionId} not found`);
      }
      if (swap.stationId !== stationId) {
        throw new BadRequestException('Swap transaction is not at your station');
      }
    }

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const trackId = await this.generateTrackId(tx, stationId);

        const incident = await tx.orm.public.Incident.include('battery')
          .include('station')
          .include('reporter')
          .include('swapTransaction')
          .include('damagedBy')
          .include('dismissedBy')
          .create({
            trackId,
            batteryId: data.batteryId,
            stationId,
            reporterId,
            swapTransactionId: data.swapTransactionId,
            status: 'open',
            image: data.image,
          });

        await tx.orm.public.IncidentMessage.create({
          incidentId: incident.id,
          authorId: reporterId,
          body: data.description,
          kind: 'initial',
        });

        const messages = await this.messageQuery()
          .where({ incidentId: incident.id })
          .orderBy((row) => row.createdAt.asc())
          .all();

        return { ...incident, messages };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('Could not allocate incident track ID; retry');
      }
      throw error;
    }
  }

  async postMessage(
    id: number,
    data: PostIncidentMessageDto,
    ctx: ReadScopeContext,
  ): Promise<IncidentDetail> {
    const incident = await this.incidentQuery().first({ id });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    await this.assertCanReadIncident(incident, ctx);
    this.assertTerminal(incident.status);

    const review = await this.canReview(ctx);
    const write = await this.canWrite(ctx);

    let kind: IncidentMessageKind;
    let nextStatus: IncidentStatus | undefined;

    if (review && (incident.status === 'open' || incident.status === 'awaiting_review')) {
      kind = 'question';
      nextStatus = 'awaiting_swapper';
    } else if (
      write &&
      incident.status === 'awaiting_swapper' &&
      incident.reporterId === ctx.user.sub
    ) {
      kind = 'reply';
      nextStatus = 'awaiting_review';
    } else {
      throw new BadRequestException(
        'You cannot post a message on this incident in its current state',
      );
    }

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.IncidentMessage.create({
        incidentId: id,
        authorId: ctx.user.sub,
        body: data.body,
        kind,
      });

      if (nextStatus) {
        await tx.orm.public.Incident.where({ id }).update({ status: nextStatus });
      }
    });

    return this.findOne(id, ctx);
  }

  async markDamaged(id: number, ctx: ReadScopeContext): Promise<IncidentDetail> {
    if (!(await this.canReview(ctx))) {
      throw new ForbiddenException('Insufficient permissions to mark incidents as damaged');
    }

    const incident = await this.incidentQuery().first({ id });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    this.assertTerminal(incident.status);

    const battery = await this.prisma.db.orm.public.Battery.first({ id: incident.batteryId });
    if (!battery) {
      throw new BadRequestException('Battery not found');
    }
    if (battery.stationId !== incident.stationId) {
      throw new BadRequestException(
        'Battery is no longer at the reporting station; cannot mark damaged',
      );
    }

    const mounted = await this.prisma.db.orm.public.Bike.where({
      currentBatteryId: battery.id,
    }).first();
    if (mounted) {
      throw new BadRequestException(
        'Battery is mounted on a bike; complete the swap before marking damaged',
      );
    }

    const now = new Date();
    const resolutionBody = `Marked damaged — battery ${battery.serialNumber} returned to warehouse.`;

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.Battery.where({ id: battery.id }).update({
        status: 'faulty',
        stationId: null,
      });

      const updatedBattery = await tx.orm.public.Battery.first({ id: battery.id });
      if (updatedBattery) {
        await syncBatteryInventory(tx, updatedBattery);
      }

      const item = await tx.orm.public.InventoryItem.first({ batteryId: battery.id });
      if (item) {
        await tx.orm.public.InventoryMovement.create({
          inventoryItemId: item.id,
          kind: 'return_to_stock',
          batteryId: battery.id,
          actorUserId: ctx.user.sub,
          details: `incident:${incident.trackId}`,
        });
      }

      await tx.orm.public.Incident.where({ id }).update({
        status: 'damaged',
        damagedAt: now,
        damagedById: ctx.user.sub,
      });

      await tx.orm.public.IncidentMessage.create({
        incidentId: id,
        authorId: ctx.user.sub,
        body: resolutionBody,
        kind: 'resolution',
      });
    });

    return this.findOne(id, ctx);
  }

  async dismiss(
    id: number,
    data: DismissIncidentDto,
    ctx: ReadScopeContext,
  ): Promise<IncidentDetail> {
    if (!(await this.canReview(ctx))) {
      throw new ForbiddenException('Insufficient permissions to dismiss incidents');
    }

    const incident = await this.incidentQuery().first({ id });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    this.assertTerminal(incident.status);

    const now = new Date();
    const body = data.note?.trim() || 'Incident dismissed without warehouse action.';

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.Incident.where({ id }).update({
        status: 'dismissed',
        dismissedAt: now,
        dismissedById: ctx.user.sub,
      });

      await tx.orm.public.IncidentMessage.create({
        incidentId: id,
        authorId: ctx.user.sub,
        body,
        kind: 'resolution',
      });
    });

    return this.findOne(id, ctx);
  }
}