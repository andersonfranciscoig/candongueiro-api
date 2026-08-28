import { Injectable } from "@nestjs/common";
import { RefundStatus, Role, TransactionStatus, TransactionType } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import type { DecideRefundDto, RequestRefundDto } from "../dto/refund.dto";

@Injectable()
export class RequestRefundUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(passengerId: string, dto: RequestRefundDto) {
    const payment = await this.prisma.ledgerTransaction.findFirst({
      where: {
        userId: passengerId,
        type: TransactionType.PAYMENT,
        reference: dto.paymentReference,
        status: TransactionStatus.COMPLETED,
      },
    });
    if (!payment) throw new NotFoundException("Pagamento");

    const refundAmount = Math.abs(payment.amount);
    if (dto.amount <= 0 || dto.amount > refundAmount) {
      throw new BadRequestException("Valor de reembolso inválido.");
    }

    const existing = await this.prisma.refundRequest.findFirst({
      where: {
        paymentReference: dto.paymentReference,
        status: { in: [RefundStatus.PENDING, RefundStatus.CONDUCTOR_APPROVED] },
      },
    });
    if (existing) {
      throw new BadRequestException("Já existe um pedido de reembolso activo para este pagamento.");
    }

    const refund = await this.prisma.refundRequest.create({
      data: {
        passengerId,
        paymentReference: dto.paymentReference,
        amount: dto.amount,
        reason: dto.reason?.trim(),
      },
    });

    const receipt = await this.prisma.ledgerTransaction.findFirst({
      where: {
        type: TransactionType.RECEIPT,
        vehiclePlate: payment.vehiclePlate,
        amount: refundAmount,
        createdAt: { gte: new Date(payment.createdAt.getTime() - 60_000) },
      },
    });

    const driverId = receipt?.userId;
    let conductorId: string | undefined;

    if (driverId) {
      const link = await this.prisma.conductorLink.findFirst({
        where: { driverId },
      });
      conductorId = link?.conductorId;

      if (conductorId) {
        await this.notifications.publish({
          userId: conductorId,
          type: "REFUND_REQUEST",
          title: "Pedido de reembolso",
          body: `Um passageiro pediu reembolso de ${dto.amount.toLocaleString("pt-AO")} Kz.`,
          meta: { refundId: refund.id, paymentReference: dto.paymentReference, amount: dto.amount },
        });
      }

      await this.notifications.publish({
        userId: driverId,
        type: "REFUND_REQUEST",
        title: "Pedido de reembolso",
        body: `Um passageiro pediu reembolso de ${dto.amount.toLocaleString("pt-AO")} Kz.`,
        meta: { refundId: refund.id, paymentReference: dto.paymentReference, amount: dto.amount },
      });
    }

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
      paymentReference: refund.paymentReference,
    };
  }
}

@Injectable()
export class DecideRefundUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(userId: string, role: Role, refundId: string, dto: DecideRefundDto) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: { passenger: true },
    });
    if (!refund) throw new NotFoundException("Reembolso");

    if (role === Role.CONDUCTOR) {
      return this.decideAsConductor(userId, refund, dto.decision);
    }
    if (role === Role.DRIVER) {
      return this.decideAsDriver(userId, refund, dto.decision);
    }
    throw new ForbiddenException("Sem permissão para decidir reembolsos.");
  }

  private async decideAsConductor(
    conductorId: string,
    refund: {
      id: string;
      passengerId: string;
      paymentReference: string;
      amount: number;
      status: RefundStatus;
      passenger: { name: string };
    },
    decision: "APPROVED" | "REJECTED",
  ) {
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException("Este reembolso já foi decidido pelo cobrador.");
    }

    const link = await this.prisma.conductorLink.findUnique({ where: { conductorId } });
    if (!link) throw new ForbiddenException("Cobrador não associado.");

    if (decision === "REJECTED") {
      await this.prisma.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REJECTED,
          conductorDecision: decision,
          conductorDecidedAt: new Date(),
          processedAt: new Date(),
        },
      });

      await this.notifications.publish({
        userId: refund.passengerId,
        type: "REFUND_REJECTED",
        title: "Reembolso rejeitado",
        body: `O seu pedido de reembolso de ${refund.amount.toLocaleString("pt-AO")} Kz foi rejeitado pelo cobrador.`,
        meta: { refundId: refund.id, paymentReference: refund.paymentReference },
      });

      return { ok: true, status: RefundStatus.REJECTED };
    }

    await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.CONDUCTOR_APPROVED,
        conductorDecision: decision,
        conductorDecidedAt: new Date(),
      },
    });

    await this.notifications.publish({
      userId: link.driverId,
      type: "REFUND_AWAITING_DRIVER",
      title: "Reembolso aguarda a sua decisão",
      body: `O cobrador aprovou reembolso de ${refund.amount.toLocaleString("pt-AO")} Kz. Confirme ou rejeite.`,
      meta: { refundId: refund.id, amount: refund.amount },
    });

    return { ok: true, status: RefundStatus.CONDUCTOR_APPROVED };
  }

  private async decideAsDriver(
    driverId: string,
    refund: {
      id: string;
      passengerId: string;
      paymentReference: string;
      amount: number;
      status: RefundStatus;
    },
    decision: "APPROVED" | "REJECTED",
  ) {
    if (refund.status !== RefundStatus.CONDUCTOR_APPROVED && refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException("Este reembolso não está pendente de decisão do motorista.");
    }

    const link = await this.prisma.conductorLink.findFirst({
      where: { driverId },
    });
    if (link && refund.status === RefundStatus.PENDING) {
      throw new BadRequestException("Aguarde a decisão do cobrador antes de decidir.");
    }

    if (decision === "REJECTED") {
      await this.prisma.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REJECTED,
          driverDecision: decision,
          driverDecidedAt: new Date(),
          processedAt: new Date(),
        },
      });

      await this.notifications.publish({
        userId: refund.passengerId,
        type: "REFUND_REJECTED",
        title: "Reembolso rejeitado",
        body: `O motorista rejeitou o seu pedido de reembolso de ${refund.amount.toLocaleString("pt-AO")} Kz.`,
        meta: { refundId: refund.id, paymentReference: refund.paymentReference },
      });

      return { ok: true, status: RefundStatus.REJECTED };
    }

    const payment = await this.prisma.ledgerTransaction.findFirst({
      where: {
        reference: refund.paymentReference,
        type: TransactionType.PAYMENT,
      },
    });
    if (!payment) throw new NotFoundException("Pagamento original");

    const receipt = await this.prisma.ledgerTransaction.findFirst({
      where: {
        userId: driverId,
        type: TransactionType.RECEIPT,
        vehiclePlate: payment.vehiclePlate,
        amount: refund.amount,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!receipt) throw new NotFoundException("Recebimento associado");

    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.balance < refund.amount) {
      throw new BadRequestException("Saldo insuficiente para reembolso.");
    }

    const refundRef = `REF-${refund.paymentReference}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: driverId },
        data: { balance: { decrement: refund.amount } },
      });
      await tx.user.update({
        where: { id: refund.passengerId },
        data: { balance: { increment: refund.amount } },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId: refund.passengerId,
          type: TransactionType.REFUND,
          amount: refund.amount,
          title: "Reembolso de viagem",
          status: TransactionStatus.COMPLETED,
          reference: refundRef,
          vehiclePlate: payment.vehiclePlate,
          meta: { paymentReference: refund.paymentReference, refundId: refund.id },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId: driverId,
          type: TransactionType.REFUND,
          amount: -refund.amount,
          title: "Reembolso emitido",
          status: TransactionStatus.COMPLETED,
          reference: `${refundRef}-DRV`,
          vehiclePlate: payment.vehiclePlate,
          meta: { paymentReference: refund.paymentReference, refundId: refund.id },
        },
      });

      await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.COMPLETED,
          driverDecision: decision,
          driverDecidedAt: new Date(),
          processedAt: new Date(),
        },
      });
    });

    await this.notifications.publish({
      userId: refund.passengerId,
      type: "REFUND_APPROVED",
      title: "Reembolso aprovado",
      body: `Recebeu ${refund.amount.toLocaleString("pt-AO")} Kz de reembolso na sua carteira.`,
      meta: { refundId: refund.id, paymentReference: refund.paymentReference, amount: refund.amount },
    });

    return { ok: true, status: RefundStatus.COMPLETED };
  }
}

@Injectable()
export class ListRefundsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, role: Role) {
    if (role === Role.PASSENGER) {
      const items = await this.prisma.refundRequest.findMany({
        where: { passengerId: userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return { items: items.map((item) => this.map(item)) };
    }

    if (role === Role.DRIVER) {
      const items = await this.prisma.refundRequest.findMany({
        where: {
          status: { in: [RefundStatus.PENDING, RefundStatus.CONDUCTOR_APPROVED] },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return { items: items.map((item) => this.map(item)) };
    }

    if (role === Role.CONDUCTOR) {
      const link = await this.prisma.conductorLink.findUnique({ where: { conductorId: userId } });
      if (!link) return { items: [] };

      const items = await this.prisma.refundRequest.findMany({
        where: { status: RefundStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return { items: items.map((item) => this.map(item)) };
    }

    return { items: [] };
  }

  private map(item: {
    id: string;
    paymentReference: string;
    amount: number;
    reason: string | null;
    status: RefundStatus;
    createdAt: Date;
    processedAt: Date | null;
  }) {
    return {
      id: item.id,
      paymentReference: item.paymentReference,
      amount: item.amount,
      reason: item.reason ?? undefined,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      processedAt: item.processedAt?.toISOString() ?? undefined,
    };
  }
}
