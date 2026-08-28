import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException } from "../../../../shared/domain/exceptions/domain.exception";
import { nextLedgerReference } from "../../../../shared/domain/utils/reference";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/repositories/wallet.repository";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import { PinVerificationService } from "../../../identity/application/services/pin-verification.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import { NotificationType } from "../../../notifications/domain/notification-types";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { WorkSessionStatus } from "@prisma/client";
import type { PayTripDto } from "../dto/wallet.dto";

const LOW_BALANCE_THRESHOLD = 2_000;

@Injectable()
export class PayTripUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallet: WalletRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly mail: MailService,
    private readonly pinVerification: PinVerificationService,
    private readonly notifications: NotificationPublisherService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(passengerId: string, dto: PayTripDto) {
    if (dto.amount <= 0) throw new BadRequestException("Informe um valor válido.");
    if (!dto.qrCode && !dto.vehiclePlate) {
      throw new BadRequestException("Indique o QR Code ou a matrícula do veículo.");
    }

    await this.pinVerification.assertValidPin(passengerId, dto.pin);

    const txCount = await this.wallet.countTransactions();
    const result = await this.wallet.payTrip({
      passengerId,
      amount: dto.amount,
      qrCode: dto.qrCode,
      vehiclePlate: dto.vehiclePlate,
      paymentRef: nextLedgerReference(txCount),
      receiptRef: nextLedgerReference(txCount + 1),
    });

    const [passenger, driver] = await Promise.all([
      this.users.findById(passengerId),
      this.users.findById(result.driverId),
    ]);

    const plate = result.transaction.vehiclePlate ?? dto.vehiclePlate ?? "—";
    const occurredAt = result.transaction.createdAt.toISOString();

    if (passenger) {
      this.mail.sendPaymentSent({
        email: passenger.email.value,
        name: passenger.name,
        amount: dto.amount,
        balanceAfter: result.balanceAfter,
        vehiclePlate: plate,
        reference: result.transaction.reference,
        occurredAt,
      });

      if (result.balanceAfter <= LOW_BALANCE_THRESHOLD) {
        this.mail.sendLowBalance({
          email: passenger.email.value,
          name: passenger.name,
          balance: result.balanceAfter,
        });
      }
    }

    if (driver) {
      await this.notifications.publish({
        userId: result.driverId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: "Pagamento recebido",
        body: `Passageiro pagou ${dto.amount.toLocaleString("pt-AO")} Kz (${plate}).`,
        meta: {
          reference: result.receiptReference,
          amount: dto.amount,
          vehiclePlate: plate,
          balanceAfter: result.driverBalance,
          occurredAt,
        },
      });
    }

    const conductorId = await this.findConductorForPayment(result.driverId);
    if (conductorId) {
      await this.notifications.publish({
        userId: conductorId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: "Novo pagamento na viagem",
        body: `Passageiro pagou ${dto.amount.toLocaleString("pt-AO")} Kz (${plate}). Confirme o recebimento.`,
        meta: {
          reference: result.receiptReference,
          amount: dto.amount,
          vehiclePlate: plate,
          occurredAt,
        },
      });
    }

    return {
      balanceAfter: result.balanceAfter,
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount,
        title: result.transaction.title,
        status: result.transaction.status,
        reference: result.transaction.reference,
        vehiclePlate: result.transaction.vehiclePlate ?? undefined,
        createdAt: occurredAt,
      },
      driverBalance: result.driverBalance,
    };
  }

  private async findConductorForPayment(driverId: string): Promise<string | null> {
    const activeSession = await this.prisma.dailyWorkSession.findFirst({
      where: {
        OR: [{ effectiveDriverId: driverId }, { ownerDriverId: driverId }],
        status: WorkSessionStatus.ACTIVE,
        conductorId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });
    if (activeSession?.conductorId) return activeSession.conductorId;

    const relation = await this.prisma.driverConductorRelation.findFirst({
      where: { driverId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (relation) return relation.conductorId;

    const link = await this.prisma.conductorLink.findFirst({ where: { driverId } });
    return link?.conductorId ?? null;
  }
}
