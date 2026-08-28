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
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
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
      this.mail.sendPaymentReceived({
        email: driver.email.value,
        name: driver.name,
        amount: dto.amount,
        balanceAfter: result.driverBalance,
        vehiclePlate: plate,
        reference: result.receiptReference,
        occurredAt,
      });
    }

    const conductorLink = await this.findConductorForDriver(result.driverId);
    if (conductorLink) {
      await this.notifications.publish({
        userId: conductorLink.conductorId,
        type: "PAYMENT_RECEIVED",
        title: "Novo pagamento na viagem",
        body: `Passageiro pagou ${dto.amount.toLocaleString("pt-AO")} Kz (${plate}). Confirme o recebimento.`,
        meta: {
          reference: result.receiptReference,
          amount: dto.amount,
          vehiclePlate: plate,
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

  private findConductorForDriver(driverId: string) {
    return this.prisma.conductorLink.findFirst({ where: { driverId } });
  }
}
