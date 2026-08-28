import { Injectable } from "@nestjs/common";
import {
  ConductorRequestStatus,
  FinancialAccess,
  Role,
  WorkSessionStatus,
} from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { startOfDay, timesOverlap } from "../../../../shared/domain/utils/time-overlap";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import { TriggerScheduledPayoutsUseCase } from "../../../conductor/application/use-cases/conductor-v2.use-cases";
import { MailService } from "../../../mail/application/mail.service";
import type { CreateWorkSessionDto, SearchAvailableConductorsDto } from "../dto/work-session.dto";

@Injectable()
export class CreateWorkSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
    private readonly mail: MailService,
  ) {}

  async execute(ownerDriverId: string, dto: CreateWorkSessionDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerDriverId } });
    if (!owner || owner.role !== Role.DRIVER) {
      throw new ForbiddenException("Apenas motoristas podem abrir turnos.");
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, ownerId: ownerDriverId },
    });
    if (!vehicle) throw new NotFoundException("Veículo");

    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = new Date(dto.scheduledEnd);
    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException("Horário de fim deve ser posterior ao início.");
    }

    let effectiveDriverId = ownerDriverId;
    if (dto.effectiveDriverPhone) {
      const phone = new Phone(dto.effectiveDriverPhone).value;
      const driver = await this.prisma.user.findUnique({ where: { phone } });
      if (!driver || driver.role !== Role.DRIVER) {
        throw new BadRequestException("Motorista efectivo não encontrado.");
      }
      effectiveDriverId = driver.id;
    }

    const existingActive = await this.prisma.dailyWorkSession.findFirst({
      where: {
        effectiveDriverId,
        status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] },
      },
    });
    if (existingActive) {
      throw new BadRequestException("Já existe um turno activo para este motorista.");
    }

    const financialAccess =
      (dto.financialAccess as FinancialAccess | undefined) ?? FinancialAccess.DAILY;

    let status: WorkSessionStatus = WorkSessionStatus.ACTIVE;
    let conductorId: string | null = null;

    if (!dto.solo && dto.conductorId) {
      conductorId = dto.conductorId;
      status = WorkSessionStatus.AWAITING_CONDUCTOR;
    }

    const session = await this.prisma.dailyWorkSession.create({
      data: {
        ownerDriverId,
        vehicleId: dto.vehicleId,
        effectiveDriverId,
        conductorId,
        scheduledStart,
        scheduledEnd,
        status,
        financialAccess,
        workDate: startOfDay(scheduledStart),
        actualStart: status === WorkSessionStatus.ACTIVE ? new Date() : null,
      },
      include: {
        vehicle: true,
        effectiveDriver: true,
      },
    });

    if (conductorId) {
      await this.prisma.sessionConductorRequest.create({
        data: { sessionId: session.id, conductorId },
      });

      const conductor = await this.prisma.user.findUnique({ where: { id: conductorId } });
      if (conductor) {
        await this.notifications.publish({
          userId: conductorId,
          type: "SESSION_REQUEST",
          title: "Pedido de turno",
          body: `${owner.name} convidou-o para trabalhar das ${scheduledStart.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })} às ${scheduledEnd.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}.`,
          meta: { sessionId: session.id },
        });
        this.mail.sendConductorSessionRequest({
          email: conductor.email,
          conductorName: conductor.name,
          driverName: owner.name,
          vehiclePlate: vehicle.plate,
          startAt: scheduledStart.toISOString(),
          endAt: scheduledEnd.toISOString(),
        });
      }
    }

    return this.mapSession(session);
  }

  private mapSession(session: {
    id: string;
    status: WorkSessionStatus;
    scheduledStart: Date;
    scheduledEnd: Date;
    actualStart: Date | null;
    actualEnd: Date | null;
    financialAccess: FinancialAccess;
    vehicle: { id: string; plate: string; model: string | null; qrCode: string };
    effectiveDriver: { id: string; name: string };
    conductorId: string | null;
  }) {
    return {
      id: session.id,
      status: session.status,
      scheduledStart: session.scheduledStart.toISOString(),
      scheduledEnd: session.scheduledEnd.toISOString(),
      actualStart: session.actualStart?.toISOString() ?? null,
      actualEnd: session.actualEnd?.toISOString() ?? null,
      financialAccess: session.financialAccess,
      conductorId: session.conductorId,
      vehicle: {
        id: session.vehicle.id,
        plate: session.vehicle.plate,
        model: session.vehicle.model,
        qrCode: session.vehicle.qrCode,
      },
      effectiveDriver: {
        id: session.effectiveDriver.id,
        name: session.effectiveDriver.name,
      },
    };
  }
}

@Injectable()
export class GetActiveWorkSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, role: Role) {
    const where =
      role === Role.DRIVER
        ? { effectiveDriverId: userId, status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] } }
        : role === Role.CONDUCTOR
          ? { conductorId: userId, status: WorkSessionStatus.ACTIVE }
          : null;

    if (!where) return { session: null };

    const session = await this.prisma.dailyWorkSession.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      include: { vehicle: true, effectiveDriver: true, ownerDriver: true, conductor: true },
    });

    if (!session) return { session: null };

    return {
      session: {
        id: session.id,
        status: session.status,
        scheduledStart: session.scheduledStart.toISOString(),
        scheduledEnd: session.scheduledEnd.toISOString(),
        actualStart: session.actualStart?.toISOString() ?? null,
        actualEnd: session.actualEnd?.toISOString() ?? null,
        financialAccess: session.financialAccess,
        vehicle: {
          id: session.vehicle.id,
          plate: session.vehicle.plate,
          model: session.vehicle.model,
          qrCode: session.vehicle.qrCode,
        },
        effectiveDriver: { id: session.effectiveDriver.id, name: session.effectiveDriver.name },
        ownerDriver: { id: session.ownerDriver.id, name: session.ownerDriver.name },
        conductor: session.conductor
          ? { id: session.conductor.id, name: session.conductor.name }
          : null,
      },
    };
  }
}

@Injectable()
export class EndWorkSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
    private readonly triggerPayouts: TriggerScheduledPayoutsUseCase,
  ) {}

  async execute(driverId: string, sessionId: string) {
    const session = await this.prisma.dailyWorkSession.findFirst({
      where: {
        id: sessionId,
        OR: [{ ownerDriverId: driverId }, { effectiveDriverId: driverId }],
        status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] },
      },
    });
    if (!session) throw new NotFoundException("Turno");

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.sessionConductorRequest.updateMany({
        where: { sessionId, status: ConductorRequestStatus.PENDING },
        data: { status: ConductorRequestStatus.CANCELLED, respondedAt: new Date() },
      });

      return tx.dailyWorkSession.update({
        where: { id: sessionId },
        data: {
          status: WorkSessionStatus.ENDED,
          actualEnd: new Date(),
        },
      });
    });

    if (session.conductorId) {
      await this.notifications.publish({
        userId: session.conductorId,
        type: "SESSION_ENDED",
        title: "Turno encerrado",
        body: "O motorista encerrou o turno de hoje.",
        meta: { sessionId },
      });
    }

    await this.triggerPayouts.triggerForSession(sessionId).catch(() => undefined);

    return { id: updated.id, status: updated.status };
  }
}

@Injectable()
export class RespondSessionRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(conductorId: string, sessionId: string, decision: "ACCEPTED" | "REJECTED") {
    const request = await this.prisma.sessionConductorRequest.findFirst({
      where: { sessionId, conductorId, status: ConductorRequestStatus.PENDING },
      include: { session: true },
    });
    if (!request) throw new NotFoundException("Pedido de turno");

    if (decision === "ACCEPTED") {
      const conflicts = await this.prisma.dailyWorkSession.findMany({
        where: {
          conductorId,
          status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] },
          id: { not: sessionId },
        },
      });

      for (const other of conflicts) {
        if (
          timesOverlap(
            request.session.scheduledStart,
            request.session.scheduledEnd,
            other.scheduledStart,
            other.scheduledEnd,
          )
        ) {
          throw new BadRequestException(
            "Já tem um turno com horário sobreposto. Não pode aceitar este pedido.",
          );
        }
      }
    }

    const status =
      decision === "ACCEPTED" ? ConductorRequestStatus.ACCEPTED : ConductorRequestStatus.REJECTED;

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionConductorRequest.update({
        where: { id: request.id },
        data: { status, respondedAt: new Date() },
      });

      if (decision === "ACCEPTED") {
        await tx.dailyWorkSession.update({
          where: { id: sessionId },
          data: {
            status: WorkSessionStatus.ACTIVE,
            conductorId,
            actualStart: new Date(),
          },
        });
      } else {
        await tx.dailyWorkSession.update({
          where: { id: sessionId },
          data: {
            status: WorkSessionStatus.ACTIVE,
            conductorId: null,
            actualStart: new Date(),
          },
        });
      }
    });

    await this.notifications.publish({
      userId: request.session.ownerDriverId,
      type: decision === "ACCEPTED" ? "SESSION_ACCEPTED" : "SESSION_REJECTED",
      title: decision === "ACCEPTED" ? "Cobrador aceitou o turno" : "Cobrador recusou o turno",
      body:
        decision === "ACCEPTED"
          ? "O cobrador confirmou que vai trabalhar consigo hoje."
          : "O cobrador não pode trabalhar neste horário.",
      meta: { sessionId },
    });

    return { ok: true, decision };
  }
}

@Injectable()
export class ListAvailableConductorsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(_driverId: string, dto: SearchAvailableConductorsDto) {
    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = new Date(dto.scheduledEnd);
    const city = dto.city ?? "Luanda";

    const profiles = await this.prisma.conductorProfile.findMany({
      where: { isAvailable: true, city },
      include: { user: true },
    });

    const busySessions = await this.prisma.dailyWorkSession.findMany({
      where: {
        status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] },
        conductorId: { not: null },
      },
    });

    const busyConductorIds = new Set<string>();
    for (const session of busySessions) {
      if (!session.conductorId) continue;
      if (timesOverlap(scheduledStart, scheduledEnd, session.scheduledStart, session.scheduledEnd)) {
        busyConductorIds.add(session.conductorId);
      }
    }

    const items = profiles
      .filter((p) => !busyConductorIds.has(p.userId))
      .map((p) => ({
        id: p.user.id,
        name: p.user.name,
        phone: p.user.phone,
        email: p.user.email,
        city: p.city,
        isAvailable: p.isAvailable,
      }));

    return { items };
  }
}

@Injectable()
export class ListPendingSessionRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(conductorId: string) {
    const requests = await this.prisma.sessionConductorRequest.findMany({
      where: { conductorId, status: ConductorRequestStatus.PENDING },
      include: {
        session: {
          include: { vehicle: true, ownerDriver: true, effectiveDriver: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: requests.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        status: r.status,
        scheduledStart: r.session.scheduledStart.toISOString(),
        scheduledEnd: r.session.scheduledEnd.toISOString(),
        vehiclePlate: r.session.vehicle.plate,
        driverName: r.session.ownerDriver.name,
        driverPhone: r.session.ownerDriver.phone,
        effectiveDriverName: r.session.effectiveDriver.name,
        financialAccess: r.session.financialAccess,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
