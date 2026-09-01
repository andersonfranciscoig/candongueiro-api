import { Injectable, Inject } from "@nestjs/common";
import {
  FinancialAccess,
  PayoutSchedule,
  PayoutStatus,
  Role,
  TransactionStatus,
  TransactionType,
  WorkSessionStatus,
} from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  InsufficientFundsException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { hashPin, isValidPinFormat } from "../../../../shared/domain/utils/pin-hash";
import { nextLedgerReference } from "../../../../shared/domain/utils/reference";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import { NotificationType } from "../../../notifications/domain/notification-types";
import { MailService } from "../../../mail/application/mail.service";
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from "../../../identity/application/ports/token.port";
import {
  AddFixedConductorDto,
  ConfirmPayoutDto,
  CreatePayoutDto,
  RegisterConductorStandaloneDto,
  SetAvailabilityDto,
} from "../../../work-session/application/dto/work-session.dto";

@Injectable()
export class RegisterConductorStandaloneUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly notifications: NotificationPublisherService,
    private readonly mail: MailService,
  ) {}

  async execute(dto: RegisterConductorStandaloneDto) {
    if (!isValidPinFormat(dto.pin)) {
      throw new BadRequestException("O PIN deve ter 6 dígitos.");
    }

    const phone = new Phone(dto.phone).value;
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException("Este telefone já está registado.");

    const email =
      dto.email?.trim().toLowerCase() ??
      `${phone.replace(/\D/g, "")}@cobrador.candongueiro.ao`;

    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw new BadRequestException("Este email já está registado.");

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          phone,
          role: Role.CONDUCTOR,
          pinHash: hashPin(dto.pin),
        },
      });
      await tx.wallet.create({ data: { userId: created.id } });
      await tx.conductorProfile.create({
        data: {
          userId: created.id,
          isAvailable: false,
          city: dto.city ?? "Luanda",
        },
      });
      return created;
    });

    const accessToken = await this.tokens.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.notifications.publish({
      userId: user.id,
      type: NotificationType.CONDUCTOR_WELCOME,
      title: "Conta de cobrador activa",
      body: "Bem-vindo! Pode confirmar pagamentos e aceitar turnos.",
      skipEmail: true,
    });
    this.mail.sendWelcomeConductor({ email: user.email, name: user.name });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: user.balance,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}

@Injectable()
export class SetConductorAvailabilityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(conductorId: string, dto: SetAvailabilityDto) {
    const profile = await this.prisma.conductorProfile.findUnique({
      where: { userId: conductorId },
    });
    if (!profile) throw new NotFoundException("Perfil de cobrador");

    const updated = await this.prisma.conductorProfile.update({
      where: { userId: conductorId },
      data: {
        isAvailable: dto.isAvailable,
        ...(dto.city ? { city: dto.city } : {}),
      },
    });

    return {
      isAvailable: updated.isAvailable,
      city: updated.city,
    };
  }
}

@Injectable()
export class DiscoverConductorsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(driverId: string, query?: string) {
    const linked = await this.prisma.driverConductorRelation.findMany({
      where: { driverId, active: true },
      select: { conductorId: true },
    });
    const excludeIds = linked.map((r) => r.conductorId);

    const users = await this.prisma.user.findMany({
      where: {
        role: Role.CONDUCTOR,
        id: { notIn: excludeIds },
        ...(query?.trim()
          ? {
              OR: [
                { name: { contains: query.trim(), mode: "insensitive" } },
                { phone: { contains: query.replace(/\D/g, "") } },
              ],
            }
          : {}),
      },
      take: 40,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        conductorProfile: { select: { city: true, isAvailable: true } },
      },
    });

    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        city: u.conductorProfile?.city ?? "Luanda",
        isAvailable: u.conductorProfile?.isAvailable ?? false,
      })),
    };
  }
}

@Injectable()
export class AddFixedConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(driverId: string, dto: AddFixedConductorDto) {
    let conductorId = dto.conductorId;
    if (!conductorId && dto.conductorPhone) {
      const phone = new Phone(dto.conductorPhone).value;
      const user = await this.prisma.user.findUnique({ where: { phone } });
      if (!user || user.role !== Role.CONDUCTOR) {
        throw new BadRequestException("Cobrador não encontrado.");
      }
      conductorId = user.id;
    }
    if (!conductorId) {
      throw new BadRequestException("Informe o cobrador.");
    }

    const relation = await this.prisma.driverConductorRelation.upsert({
      where: { driverId_conductorId: { driverId, conductorId } },
      create: {
        driverId,
        conductorId,
        active: true,
        financialAccess:
          (dto.financialAccess as FinancialAccess | undefined) ?? FinancialAccess.DAILY,
        payoutSchedule:
          (dto.payoutSchedule as PayoutSchedule | undefined) ?? PayoutSchedule.MANUAL,
      },
      update: {
        active: true,
        deactivatedAt: null,
        financialAccess:
          (dto.financialAccess as FinancialAccess | undefined) ?? FinancialAccess.DAILY,
        payoutSchedule:
          (dto.payoutSchedule as PayoutSchedule | undefined) ?? PayoutSchedule.MANUAL,
      },
      include: { conductor: true },
    });

    await this.notifications.publish({
      userId: conductorId,
      type: "CONDUCTOR_LINKED",
      title: "Associado a motorista",
      body: "Um motorista adicionou-o como cobrador fixo.",
      meta: { driverId },
    });

    return {
      id: relation.id,
      conductor: {
        id: relation.conductor.id,
        name: relation.conductor.name,
        phone: relation.conductor.phone,
        email: relation.conductor.email,
      },
      financialAccess: relation.financialAccess,
      payoutSchedule: relation.payoutSchedule,
      active: relation.active,
    };
  }
}

@Injectable()
export class DeactivateConductorRelationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(driverId: string, conductorId: string) {
    const relation = await this.prisma.driverConductorRelation.findFirst({
      where: { driverId, conductorId, active: true },
      include: { conductor: true, driver: true },
    });
    if (!relation) throw new NotFoundException("Associação");

    await this.prisma.$transaction(async (tx) => {
      await tx.driverConductorRelation.update({
        where: { id: relation.id },
        data: { active: false, deactivatedAt: new Date() },
      });

      await tx.dailyWorkSession.updateMany({
        where: {
          ownerDriverId: driverId,
          conductorId,
          status: { in: [WorkSessionStatus.AWAITING_CONDUCTOR, WorkSessionStatus.ACTIVE] },
        },
        data: { status: WorkSessionStatus.CANCELLED, actualEnd: new Date() },
      });
    });

    await this.notifications.publish({
      userId: conductorId,
      type: NotificationType.CONDUCTOR_UNLINKED,
      title: "Desassociado do motorista",
      body: `${relation.driver.name} removeu a associação de cobrador.`,
      meta: { driverId },
    });

    return { ok: true };
  }
}

@Injectable()
export class ListDriverConductorsV2UseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(driverId: string) {
    const items = await this.prisma.driverConductorRelation.findMany({
      where: { driverId, active: true },
      include: { conductor: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: items.map((r) => ({
        relationId: r.id,
        id: r.conductor.id,
        name: r.conductor.name,
        phone: r.conductor.phone,
        email: r.conductor.email,
        financialAccess: r.financialAccess,
        payoutSchedule: r.payoutSchedule,
        linkedAt: r.createdAt.toISOString(),
      })),
    };
  }
}

@Injectable()
export class CreateConductorPayoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(driverId: string, dto: CreatePayoutDto) {
    if (dto.amount <= 0) throw new BadRequestException("Valor inválido.");

    const relation = await this.prisma.driverConductorRelation.findFirst({
      where: { driverId, conductorId: dto.conductorId, active: true },
    });
    if (!relation) {
      throw new ForbiddenException("Este cobrador não está associado a si.");
    }

    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.balance < dto.amount) {
      throw new InsufficientFundsException();
    }

    const txCount = await this.prisma.ledgerTransaction.count();
    const reference = nextLedgerReference(txCount);

    const payout = await this.prisma.conductorPayout.create({
      data: {
        driverId,
        conductorId: dto.conductorId,
        sessionId: dto.sessionId,
        amount: dto.amount,
        scheduleType: PayoutSchedule.MANUAL,
        status: PayoutStatus.AWAITING_DRIVER,
        reference,
      },
    });

    await this.notifications.publish({
      userId: driverId,
      type: "PAYOUT_CONFIRM",
      title: "Confirmar pagamento ao cobrador",
      body: `Confirme o pagamento de ${dto.amount.toLocaleString("pt-AO")} Kz ao cobrador.`,
      meta: { payoutId: payout.id, amount: dto.amount },
    });

    return {
      id: payout.id,
      reference: payout.reference,
      amount: payout.amount,
      status: payout.status,
    };
  }
}

@Injectable()
export class ConfirmConductorPayoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(userId: string, role: Role, payoutId: string, dto: ConfirmPayoutDto & { amount?: number }) {
    const payout = await this.prisma.conductorPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException("Pagamento");

    const asRole = dto.role;

    if (asRole === "DRIVER") {
      if (payout.driverId !== userId) throw new ForbiddenException("Sem permissão.");
      if (payout.status !== PayoutStatus.AWAITING_DRIVER) {
        throw new BadRequestException("Pagamento já confirmado pelo motorista.");
      }

      const amount = dto.amount && dto.amount > 0 ? dto.amount : payout.amount;
      if (amount <= 0) throw new BadRequestException("Informe o valor a pagar.");

      const driver = await this.prisma.user.findUnique({ where: { id: payout.driverId } });
      if (!driver || driver.balance < amount) throw new InsufficientFundsException();

      await this.prisma.$transaction(async (tx) => {
        if (amount !== payout.amount) {
          await tx.conductorPayout.update({ where: { id: payoutId }, data: { amount } });
        }

        await tx.user.update({
          where: { id: payout.driverId },
          data: { balance: { decrement: amount } },
        });
        await tx.user.update({
          where: { id: payout.conductorId },
          data: { balance: { increment: amount } },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: payout.driverId,
            type: TransactionType.CONDUCTOR_PAYOUT,
            amount: -amount,
            title: "Pagamento ao cobrador",
            status: TransactionStatus.COMPLETED,
            reference: payout.reference,
            meta: { payoutId: payout.id, conductorId: payout.conductorId },
          },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: payout.conductorId,
            type: TransactionType.CONDUCTOR_PAYOUT,
            amount,
            title: "Recebido do motorista",
            status: TransactionStatus.COMPLETED,
            reference: `${payout.reference}-CB`,
            meta: { payoutId: payout.id, driverId: payout.driverId },
          },
        });

        await tx.conductorPayout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.PENDING_CONDUCTOR,
            driverConfirmedAt: new Date(),
          },
        });
      });

      await this.notifications.publish({
        userId: payout.conductorId,
        type: "PAYOUT_RECEIVED",
        title: "Pagamento recebido?",
        body: `O motorista enviou ${amount.toLocaleString("pt-AO")} Kz. Confirme que recebeu.`,
        meta: { payoutId: payout.id, amount },
      });

      return { ok: true, status: PayoutStatus.PENDING_CONDUCTOR };
    }

    if (payout.conductorId !== userId) throw new ForbiddenException("Sem permissão.");
    if (payout.status !== PayoutStatus.PENDING_CONDUCTOR) {
      throw new BadRequestException("Aguarda confirmação do motorista primeiro.");
    }

    await this.prisma.conductorPayout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.COMPLETED, conductorConfirmedAt: new Date() },
    });

    await this.notifications.publish({
      userId: payout.driverId,
      type: "PAYOUT_COMPLETED",
      title: "Cobrador confirmou recebimento",
      body: `O cobrador confirmou o pagamento de ${payout.amount.toLocaleString("pt-AO")} Kz.`,
      meta: { payoutId: payout.id },
    });

    return { ok: true, status: PayoutStatus.COMPLETED };
  }
}

@Injectable()
export class ListConductorPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, role: Role) {
    const where =
      role === Role.DRIVER
        ? { driverId: userId }
        : role === Role.CONDUCTOR
          ? { conductorId: userId }
          : null;
    if (!where) return { items: [] };

    const items = await this.prisma.conductorPayout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return {
      items: items.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        reference: p.reference,
        scheduleType: p.scheduleType,
        sessionId: p.sessionId,
        createdAt: p.createdAt.toISOString(),
        driverConfirmedAt: p.driverConfirmedAt?.toISOString() ?? null,
        conductorConfirmedAt: p.conductorConfirmedAt?.toISOString() ?? null,
      })),
    };
  }
}

@Injectable()
export class TriggerScheduledPayoutsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  /** Verifica turnos terminados com pagamento automático pendente. */
  async execute() {
    const endedSessions = await this.prisma.dailyWorkSession.findMany({
      where: {
        status: WorkSessionStatus.ENDED,
        conductorId: { not: null },
        scheduledEnd: { lte: new Date() },
      },
    });

    let triggered = 0;
    for (const session of endedSessions) {
      if (await this.maybeTriggerForSession(session.id)) triggered++;
    }

    return { triggered };
  }

  async triggerForSession(sessionId: string) {
    const triggered = await this.maybeTriggerForSession(sessionId);
    return { triggered: triggered ? 1 : 0 };
  }

  private async maybeTriggerForSession(sessionId: string): Promise<boolean> {
    const session = await this.prisma.dailyWorkSession.findFirst({
      where: {
        id: sessionId,
        status: WorkSessionStatus.ENDED,
        conductorId: { not: null },
      },
    });
    if (!session?.conductorId) return false;

    const relation = await this.prisma.driverConductorRelation.findFirst({
      where: {
        driverId: session.ownerDriverId,
        conductorId: session.conductorId,
        active: true,
        payoutSchedule: { not: PayoutSchedule.MANUAL },
      },
    });
    if (!relation) return false;

    const existing = await this.prisma.conductorPayout.findFirst({
      where: { sessionId: session.id },
    });
    if (existing) return false;

    const txCount = await this.prisma.ledgerTransaction.count();
    const payout = await this.prisma.conductorPayout.create({
      data: {
        driverId: session.ownerDriverId,
        conductorId: session.conductorId,
        sessionId: session.id,
        amount: 0,
        scheduleType: relation.payoutSchedule,
        status: PayoutStatus.AWAITING_DRIVER,
        reference: nextLedgerReference(txCount),
        scheduledAt: session.scheduledEnd,
      },
    });

    await this.notifications.publish({
      userId: session.ownerDriverId,
      type: "PAYOUT_SCHEDULED",
      title: "Pagamento automático ao cobrador",
      body: "O turno terminou. Confirme o valor a pagar ao cobrador.",
      meta: { payoutId: payout.id, sessionId: session.id },
    });

    return true;
  }
}
