import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InviteStatus, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { hashPin } from "../../../../shared/domain/utils/pin-hash";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { MailService } from "../../../mail/application/mail.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from "../../../identity/application/ports/token.port";
import type { InviteConductorDto } from "../dto/conductor.dto";

@Injectable()
export class InviteConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async execute(driverId: string, dto: InviteConductorDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException("Informe o email ou telefone do cobrador.");
    }

    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.role !== Role.DRIVER) {
      throw new ForbiddenException("Apenas motoristas podem convidar cobradores.");
    }

    const phone = dto.phone ? new Phone(dto.phone).value : undefined;
    const email = dto.email?.trim().toLowerCase();
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const frontendUrl = (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );

    const invite = await this.prisma.conductorInvite.create({
      data: {
        driverId,
        email,
        phone,
        token,
        expiresAt,
      },
    });

    if (email) {
      this.mail.sendConductorInvite({
        email,
        driverName: driver.name,
        registerUrl: `${frontendUrl}/cobrador/registo?token=${token}`,
      });
    }

    return {
      id: invite.id,
      email: invite.email ?? undefined,
      phone: invite.phone ?? undefined,
      expiresAt: invite.expiresAt.toISOString(),
      inviteLink: email ? `${frontendUrl}/cobrador/registo?token=${token}` : undefined,
    };
  }
}

@Injectable()
export class CheckConductorInviteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { token?: string; phone?: string }) {
    if (!input.token && !input.phone) {
      throw new BadRequestException("Informe o token ou telefone.");
    }

    const phone = input.phone ? new Phone(input.phone).value : undefined;
    const invite = await this.prisma.conductorInvite.findFirst({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
        ...(input.token ? { token: input.token } : {}),
        ...(phone ? { phone } : {}),
      },
      include: { driver: true },
    });

    if (!invite) {
      throw new NotFoundException("Convite");
    }

    return {
      token: invite.token,
      email: invite.email ?? undefined,
      phone: invite.phone ?? undefined,
      driverName: invite.driver.name,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }
}

@Injectable()
export class RegisterConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async execute(dto: import("../dto/conductor.dto").RegisterConductorDto) {
    if (!dto.token && !dto.phone) {
      throw new BadRequestException("Informe o token ou telefone do convite.");
    }

    const phone = dto.phone ? new Phone(dto.phone).value : undefined;
    const invite = await this.prisma.conductorInvite.findFirst({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
        ...(dto.token ? { token: dto.token } : { phone }),
      },
    });

    if (!invite) {
      throw new NotFoundException("Convite inválido ou expirado.");
    }

    const normalizedPhone = dto.phone ? phone! : invite.phone;
    if (!normalizedPhone) {
      throw new BadRequestException("Informe o número de telefone.");
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existing) {
      throw new BadRequestException("Este telefone já está registado.");
    }

    const email =
      invite.email ??
      `${normalizedPhone.replace(/\D/g, "")}@cobrador.candongueiro.ao`;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          phone: normalizedPhone,
          role: Role.CONDUCTOR,
          pinHash: hashPin(dto.pin),
        },
      });

      await tx.wallet.create({ data: { userId: user.id } });

      await tx.conductorProfile.create({
        data: { userId: user.id, isAvailable: false, city: "Luanda" },
      });

      await tx.driverConductorRelation.create({
        data: {
          driverId: invite.driverId,
          conductorId: user.id,
          active: true,
        },
      });

      await tx.conductorLink.create({
        data: {
          driverId: invite.driverId,
          conductorId: user.id,
        },
      });

      await tx.conductorInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
      });

      return user;
    });

    await this.notifications.publish({
      userId: invite.driverId,
      type: "CONDUCTOR_JOINED",
      title: "Novo cobrador associado",
      body: `${result.name} aceitou o convite e está ligado à sua conta.`,
      meta: { conductorId: result.id },
    });

    const accessToken = await this.tokens.sign({
      sub: result.id,
      email: result.email,
      role: result.role,
    });

    return {
      accessToken,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        phone: result.phone,
        role: result.role,
        balance: result.balance,
        createdAt: result.createdAt.toISOString(),
      },
    };
  }
}

@Injectable()
export class GetConductorDashboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(conductorId: string) {
    const profile = await this.prisma.conductorProfile.findUnique({
      where: { userId: conductorId },
    });

    const activeSession = await this.prisma.dailyWorkSession.findFirst({
      where: { conductorId, status: "ACTIVE" },
      include: { ownerDriver: true, vehicle: true },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSession) {
      return {
        isAvailable: profile?.isAvailable ?? false,
        city: profile?.city ?? "Luanda",
        activeSession: null,
        canWithdraw: false,
        recentPayments: [],
        pendingPayouts: await this.pendingPayouts(conductorId),
      };
    }

    const driverId = activeSession.ownerDriverId;
    const receiptFilter: {
      userId: string;
      type: "RECEIPT";
      createdAt?: { gte: Date; lte?: Date };
    } = { userId: driverId, type: "RECEIPT" };

    if (activeSession.financialAccess === "DAILY" && activeSession.actualStart) {
      receiptFilter.createdAt = {
        gte: activeSession.actualStart,
        lte: activeSession.actualEnd ?? new Date(),
      };
    }

    const driverReceipts = await this.prisma.ledgerTransaction.findMany({
      where: receiptFilter,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const showBalance = activeSession.financialAccess === "FULL";

    return {
      isAvailable: profile?.isAvailable ?? false,
      city: profile?.city ?? "Luanda",
      activeSession: {
        id: activeSession.id,
        vehiclePlate: activeSession.vehicle.plate,
        scheduledEnd: activeSession.scheduledEnd.toISOString(),
        financialAccess: activeSession.financialAccess,
      },
      driver: {
        id: activeSession.ownerDriver.id,
        name: activeSession.ownerDriver.name,
        phone: activeSession.ownerDriver.phone,
        balance: showBalance ? activeSession.ownerDriver.balance : undefined,
      },
      canWithdraw: false,
      recentPayments: driverReceipts.map((tx) => {
        const meta = (tx.meta as Record<string, unknown> | null) ?? {};
        return {
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          vehiclePlate: tx.vehiclePlate ?? undefined,
          conductorConfirmed: Boolean(meta.conductorConfirmedAt),
          createdAt: tx.createdAt.toISOString(),
        };
      }),
      pendingPayouts: await this.pendingPayouts(conductorId),
    };
  }

  private async pendingPayouts(conductorId: string) {
    const items = await this.prisma.conductorPayout.findMany({
      where: { conductorId, status: "PENDING_CONDUCTOR" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return items.map((p) => ({
      id: p.id,
      amount: p.amount,
      reference: p.reference,
      status: p.status,
    }));
  }
}

@Injectable()
export class ConfirmPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(conductorId: string, reference: string) {
    const activeSession = await this.prisma.dailyWorkSession.findFirst({
      where: { conductorId, status: "ACTIVE" },
    });
    if (!activeSession) {
      throw new ForbiddenException("Não tem um turno activo.");
    }

    const receipt = await this.prisma.ledgerTransaction.findFirst({
      where: {
        userId: activeSession.ownerDriverId,
        type: "RECEIPT",
        reference,
      },
    });
    if (!receipt) throw new NotFoundException("Pagamento");

    const meta = (receipt.meta as Record<string, unknown> | null) ?? {};
    if (meta.conductorConfirmedAt) {
      throw new BadRequestException("Este pagamento já foi confirmado.");
    }

    await this.prisma.ledgerTransaction.update({
      where: { id: receipt.id },
      data: {
        meta: {
          ...meta,
          conductorConfirmedAt: new Date().toISOString(),
          confirmedByConductorId: conductorId,
        },
      },
    });

    await this.notifications.publish({
      userId: activeSession.ownerDriverId,
      type: "PAYMENT_CONFIRMED",
      title: "Pagamento confirmado pelo cobrador",
      body: `O cobrador confirmou o recebimento de ${receipt.amount.toLocaleString("pt-AO")} Kz (${receipt.vehiclePlate ?? "—"}).`,
      meta: { reference, amount: receipt.amount },
    });

    return { ok: true, reference };
  }
}

@Injectable()
export class ListDriverConductorsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(driverId: string) {
    const links = await this.prisma.conductorLink.findMany({
      where: { driverId },
      include: { conductor: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: links.map((link) => ({
        id: link.conductor.id,
        name: link.conductor.name,
        phone: link.conductor.phone,
        email: link.conductor.email,
        linkedAt: link.createdAt.toISOString(),
      })),
    };
  }
}

@Injectable()
export class RequestConductorWithdrawUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(conductorId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Informe um valor válido.");

    const link = await this.prisma.conductorLink.findUnique({
      where: { conductorId },
      include: { conductor: true },
    });
    if (!link) throw new ForbiddenException("Cobrador não associado.");

    const request = await this.prisma.conductorWithdrawRequest.create({
      data: {
        conductorId,
        driverId: link.driverId,
        amount,
      },
    });

    await this.notifications.publish({
      userId: link.driverId,
      type: "CONDUCTOR_WITHDRAW_REQUEST",
      title: "Pedido de levantamento do cobrador",
      body: `${link.conductor.name} solicitou levantar ${amount.toLocaleString("pt-AO")} Kz. Aprove ou rejeite.`,
      meta: { requestId: request.id, amount },
    });

    return {
      id: request.id,
      status: request.status,
      amount: request.amount,
    };
  }
}

@Injectable()
export class DecideConductorWithdrawUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(driverId: string, requestId: string, decision: "APPROVED" | "REJECTED") {
    const request = await this.prisma.conductorWithdrawRequest.findFirst({
      where: { id: requestId, driverId, status: "PENDING" },
      include: { conductor: true },
    });
    if (!request) throw new NotFoundException("Pedido de levantamento");

    await this.prisma.conductorWithdrawRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "APPROVED" ? "COMPLETED" : "FAILED",
        driverDecision: decision,
        decidedAt: new Date(),
      },
    });

    await this.notifications.publish({
      userId: request.conductorId,
      type: "CONDUCTOR_WITHDRAW_DECISION",
      title: decision === "APPROVED" ? "Levantamento aprovado" : "Levantamento rejeitado",
      body:
        decision === "APPROVED"
          ? `O motorista aprovou o seu pedido de ${request.amount.toLocaleString("pt-AO")} Kz.`
          : `O motorista rejeitou o pedido de levantamento de ${request.amount.toLocaleString("pt-AO")} Kz.`,
      meta: { requestId, decision, amount: request.amount },
    });

    return { ok: true, decision };
  }
}
