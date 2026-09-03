import { Injectable } from "@nestjs/common";
import { TransactionStatus, TransactionType } from "@prisma/client";
import {
  BadRequestException,
  InsufficientFundsException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { nextLedgerReference } from "../../../../shared/domain/utils/reference";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { PinVerificationService } from "../../../identity/application/services/pin-verification.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import type { TransferDto } from "../dto/wallet.dto";

@Injectable()
export class TransferUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pins: PinVerificationService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(senderId: string, dto: TransferDto) {
    if (dto.amount <= 0) throw new BadRequestException("Informe um valor válido.");

    await this.pins.assertValidPin(senderId, dto.pin);

    const toPhone = new Phone(dto.toPhone).value;
    const [sender, recipient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderId } }),
      this.prisma.user.findUnique({ where: { phone: toPhone } }),
    ]);

    if (!sender) throw new NotFoundException("Utilizador");
    if (!recipient) {
      throw new BadRequestException("Não existe conta CandongueiroPay com este telefone.");
    }
    if (recipient.id === senderId) {
      throw new BadRequestException("Não pode transferir para a sua própria carteira.");
    }
    if (sender.balance < dto.amount) throw new InsufficientFundsException();

    const txCount = await this.prisma.ledgerTransaction.count();
    const outRef = nextLedgerReference(txCount);
    const inRef = `${outRef}-IN`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: { balance: { decrement: dto.amount } },
      });
      await tx.user.update({
        where: { id: recipient.id },
        data: { balance: { increment: dto.amount } },
      });

      const outTx = await tx.ledgerTransaction.create({
        data: {
          userId: senderId,
          type: TransactionType.TRANSFER_OUT,
          amount: -dto.amount,
          title: `Transferência para ${recipient.name}`,
          status: TransactionStatus.COMPLETED,
          reference: outRef,
          meta: {
            counterpartId: recipient.id,
            counterpartPhone: recipient.phone,
            counterpartName: recipient.name,
          },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId: recipient.id,
          type: TransactionType.TRANSFER_IN,
          amount: dto.amount,
          title: `Transferência de ${sender.name}`,
          status: TransactionStatus.COMPLETED,
          reference: inRef,
          meta: {
            counterpartId: senderId,
            counterpartPhone: sender.phone,
            counterpartName: sender.name,
          },
        },
      });

      return { balanceAfter: updatedSender.balance, transaction: outTx };
    });

    await this.notifications.publish({
      userId: recipient.id,
      type: "WALLET_TRANSFER_RECEIVED",
      title: "Recebeu uma transferência",
      body: `${sender.name} enviou-lhe ${dto.amount.toLocaleString("pt-AO")} Kz.`,
      meta: {
        amount: dto.amount,
        fromUserId: senderId,
        fromName: sender.name,
        reference: inRef,
      },
    });

    return {
      balanceAfter: result.balanceAfter,
      recipient: { id: recipient.id, name: recipient.name, phone: recipient.phone },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount,
        title: result.transaction.title,
        status: result.transaction.status,
        reference: result.transaction.reference,
        createdAt: result.transaction.createdAt.toISOString(),
      },
    };
  }
}
