import { Injectable } from "@nestjs/common";
import {
  ConductorRequestStatus,
  PayoutStatus,
  TransactionStatus,
  TransactionType,
  WorkSessionStatus,
} from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class GetConductorActivityStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(conductorId: string) {
    const [sessions, invitations, payouts, confirmedReceipts] = await Promise.all([
      this.prisma.dailyWorkSession.findMany({
        where: {
          conductorId,
          status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.ENDED] },
        },
        select: {
          id: true,
          ownerDriverId: true,
          workDate: true,
          actualStart: true,
          actualEnd: true,
          scheduledStart: true,
          scheduledEnd: true,
          status: true,
        },
      }),
      this.prisma.sessionConductorRequest.groupBy({
        by: ["status"],
        where: { conductorId },
        _count: { _all: true },
      }),
      this.prisma.conductorPayout.findMany({
        where: {
          conductorId,
          status: { in: [PayoutStatus.COMPLETED, PayoutStatus.PENDING_CONDUCTOR] },
        },
        select: { amount: true, status: true },
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          type: TransactionType.RECEIPT,
          status: TransactionStatus.COMPLETED,
          meta: { path: ["confirmedByConductorId"], equals: conductorId },
        },
        select: { amount: true },
      }),
    ]);

    const driverIds = new Set(sessions.map((s) => s.ownerDriverId));
    const days = new Set(
      sessions.map((s) => dayKey(s.workDate ?? s.actualStart ?? s.scheduledStart)),
    );

    const inviteCounts = {
      accepted: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const row of invitations) {
      const n = row._count._all;
      if (row.status === ConductorRequestStatus.ACCEPTED) inviteCounts.accepted = n;
      else if (row.status === ConductorRequestStatus.REJECTED) inviteCounts.rejected = n;
      else if (row.status === ConductorRequestStatus.PENDING) inviteCounts.pending = n;
      else if (row.status === ConductorRequestStatus.CANCELLED) inviteCounts.cancelled = n;
    }

    const clientPaymentsCount = confirmedReceipts.length;
    const clientPaymentsAmount = confirmedReceipts.reduce(
      (sum, r) => sum + Math.abs(r.amount),
      0,
    );

    const driverPayoutsCount = payouts.length;
    const driverPayoutsAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    // Fallback: se ainda não há confirmações, estimar pagamentos nas janelas dos turnos aceites
    let estimatedClientPaymentsCount = clientPaymentsCount;
    let estimatedClientPaymentsAmount = clientPaymentsAmount;
    if (clientPaymentsCount === 0 && sessions.length > 0) {
      let count = 0;
      let amount = 0;
      for (const session of sessions) {
        const from = session.actualStart ?? session.scheduledStart;
        const to = session.actualEnd ?? session.scheduledEnd ?? new Date();
        const rows = await this.prisma.ledgerTransaction.findMany({
          where: {
            userId: session.ownerDriverId,
            type: TransactionType.RECEIPT,
            status: TransactionStatus.COMPLETED,
            createdAt: { gte: from, lte: to },
          },
          select: { amount: true },
        });
        count += rows.length;
        amount += rows.reduce((s, r) => s + Math.abs(r.amount), 0);
      }
      estimatedClientPaymentsCount = count;
      estimatedClientPaymentsAmount = amount;
    }

    return {
      driversWorkedWith: driverIds.size,
      daysWorked: days.size,
      sessionsWorked: sessions.length,
      invitationsAccepted: inviteCounts.accepted,
      invitationsRejected: inviteCounts.rejected,
      invitationsPending: inviteCounts.pending,
      clientPaymentsCount: estimatedClientPaymentsCount,
      clientPaymentsAmount: estimatedClientPaymentsAmount,
      driverPayoutsCount,
      driverPayoutsAmount,
    };
  }
}

@Injectable()
export class GetDriverActivityStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(driverId: string) {
    const sessionWhere = {
      OR: [{ ownerDriverId: driverId }, { effectiveDriverId: driverId }],
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.ENDED, WorkSessionStatus.AWAITING_CONDUCTOR] },
    };

    const [sessions, sessionIds, receipts, payouts] = await Promise.all([
      this.prisma.dailyWorkSession.findMany({
        where: sessionWhere,
        select: {
          id: true,
          conductorId: true,
          workDate: true,
          actualStart: true,
          scheduledStart: true,
          status: true,
        },
      }),
      this.prisma.dailyWorkSession.findMany({
        where: {
          OR: [{ ownerDriverId: driverId }, { effectiveDriverId: driverId }],
        },
        select: { id: true },
      }),
      this.prisma.ledgerTransaction.findMany({
        where: {
          userId: driverId,
          type: TransactionType.RECEIPT,
          status: TransactionStatus.COMPLETED,
        },
        select: { amount: true },
      }),
      this.prisma.conductorPayout.findMany({
        where: {
          driverId,
          status: { in: [PayoutStatus.COMPLETED, PayoutStatus.PENDING_CONDUCTOR] },
        },
        select: { amount: true },
      }),
    ]);

    const ids = sessionIds.map((s) => s.id);
    const invitations = ids.length
      ? await this.prisma.sessionConductorRequest.groupBy({
          by: ["status"],
          where: { sessionId: { in: ids } },
          _count: { _all: true },
        })
      : [];

    const conductorIds = new Set(
      sessions.map((s) => s.conductorId).filter((id): id is string => Boolean(id)),
    );
    const days = new Set(
      sessions.map((s) => dayKey(s.workDate ?? s.actualStart ?? s.scheduledStart)),
    );
    const sessionsEnded = sessions.filter((s) => s.status === WorkSessionStatus.ENDED).length;

    let invitationsAccepted = 0;
    let invitationsRejected = 0;
    let invitationsPending = 0;
    for (const row of invitations) {
      const n = row._count._all;
      if (row.status === ConductorRequestStatus.ACCEPTED) invitationsAccepted = n;
      else if (row.status === ConductorRequestStatus.REJECTED) invitationsRejected = n;
      else if (row.status === ConductorRequestStatus.PENDING) invitationsPending = n;
    }

    const clientReceiptsCount = receipts.length;
    const clientReceiptsAmount = receipts.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const payoutsPaidCount = payouts.length;
    const payoutsPaidAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    return {
      conductorsWorkedWith: conductorIds.size,
      daysWorked: days.size,
      sessionsWorked: sessions.length,
      sessionsEnded,
      invitationsAccepted,
      invitationsRejected,
      invitationsPending,
      clientReceiptsCount,
      clientReceiptsAmount,
      payoutsPaidCount,
      payoutsPaidAmount,
    };
  }
}
