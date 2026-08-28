import { Injectable } from "@nestjs/common";
import {
  TransactionStatus,
  TransactionType,
  WithdrawMethod as PrismaWithdrawMethod,
} from "@prisma/client";
import {
  BadRequestException,
  InsufficientFundsException,
  NotFoundException,
} from "../../../../../shared/domain/exceptions/domain.exception";
import {
  TransactionStatus as DomainTransactionStatus,
  TransactionType as DomainTransactionType,
  WithdrawMethod,
} from "../../../../../shared/domain/types/enums";
import { PrismaService } from "../../../../../shared/infrastructure/persistence/prisma/prisma.service";
import type {
  LedgerTransactionRecord,
  PaymentResultRecord,
  PayTripResultRecord,
  TopUpRequestRecord,
  WalletRepository,
  WalletSnapshot,
} from "../../../domain/repositories/wallet.repository";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapTx(row: {
    id: string;
    type: TransactionType;
    amount: number;
    title: string;
    status: TransactionStatus;
    reference: string;
    vehiclePlate: string | null;
    createdAt: Date;
  }): LedgerTransactionRecord {
    return {
      id: row.id,
      type: row.type as DomainTransactionType,
      amount: row.amount,
      title: row.title,
      status: row.status as DomainTransactionStatus,
      reference: row.reference,
      vehiclePlate: row.vehiclePlate,
      createdAt: row.createdAt,
    };
  }

  async getSnapshot(userId: string, limit = 50): Promise<WalletSnapshot | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const transactions = await this.prisma.ledgerTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      balance: user.balance,
      transactions: transactions.map((tx) => this.mapTx(tx)),
    };
  }

  async countTransactions(): Promise<number> {
    return this.prisma.ledgerTransaction.count();
  }

  async createTopUpRequest(
    userId: string,
    input: { amount: number; entity: string; reference: string },
  ): Promise<TopUpRequestRecord> {
    const request = await this.prisma.topUpRequest.create({
      data: {
        userId,
        amount: input.amount,
        entity: input.entity,
        reference: input.reference,
      },
    });

    return {
      id: request.id,
      amount: request.amount,
      entity: request.entity,
      reference: request.reference,
      status: request.status as DomainTransactionStatus,
      createdAt: request.createdAt,
    };
  }

  async confirmTopUp(userId: string, reference: string): Promise<PaymentResultRecord> {
    const request = await this.prisma.topUpRequest.findFirst({
      where: { userId, reference },
    });

    if (!request) throw new NotFoundException("Pedido de carregamento");
    if (request.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException("Este carregamento já foi confirmado.");
    }

    const ledgerReference = `EXP-${request.reference}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: request.amount } },
      });

      await tx.topUpRequest.update({
        where: { id: request.id },
        data: { status: TransactionStatus.COMPLETED, paidAt: new Date() },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          userId,
          type: TransactionType.TOPUP,
          amount: request.amount,
          title: "Carregamento · Multicaixa Express",
          status: TransactionStatus.COMPLETED,
          reference: ledgerReference,
        },
      });

      return { user, ledger };
    });

    return {
      balanceAfter: result.user.balance,
      transaction: this.mapTx(result.ledger),
    };
  }

  async payTrip(input: {
    passengerId: string;
    amount: number;
    qrCode?: string;
    vehiclePlate?: string;
    paymentRef: string;
    receiptRef: string;
  }): Promise<PayTripResultRecord> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: input.qrCode
        ? { qrCode: input.qrCode }
        : { plate: input.vehiclePlate!.toUpperCase() },
    });

    if (!vehicle) throw new NotFoundException("Veículo");
    if (vehicle.ownerId === input.passengerId) {
      throw new BadRequestException("Não pode pagar viagem ao seu próprio veículo.");
    }

    const passenger = await this.prisma.user.findUnique({
      where: { id: input.passengerId },
    });
    if (!passenger) throw new NotFoundException("Utilizador");
    if (passenger.balance < input.amount) throw new InsufficientFundsException();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPassenger = await tx.user.update({
        where: { id: input.passengerId },
        data: { balance: { decrement: input.amount } },
      });

      const updatedDriver = await tx.user.update({
        where: { id: vehicle.ownerId },
        data: { balance: { increment: input.amount } },
      });

      const payment = await tx.ledgerTransaction.create({
        data: {
          userId: input.passengerId,
          type: TransactionType.PAYMENT,
          amount: -input.amount,
          title: "Viagem de candongueiro",
          status: TransactionStatus.COMPLETED,
          reference: input.paymentRef,
          vehiclePlate: vehicle.plate,
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId: vehicle.ownerId,
          type: TransactionType.RECEIPT,
          amount: input.amount,
          title: `Recebimento · ${vehicle.plate}`,
          status: TransactionStatus.COMPLETED,
          reference: input.receiptRef,
          vehiclePlate: vehicle.plate,
          meta: { passengerId: input.passengerId },
        },
      });

      return { payment, updatedPassenger, updatedDriver, receiptRef: input.receiptRef };
    });

    return {
      balanceAfter: result.updatedPassenger.balance,
      driverId: vehicle.ownerId,
      driverBalance: result.updatedDriver.balance,
      receiptReference: result.receiptRef,
      transaction: this.mapTx(result.payment),
    };
  }

  async withdraw(input: {
    userId: string;
    amount: number;
    method: WithdrawMethod;
    expressPhone?: string;
    iban?: string;
    bankName?: string;
    reference: string;
    title: string;
  }): Promise<PaymentResultRecord> {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundException("Utilizador");
    if (user.balance < input.amount) throw new InsufficientFundsException();

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: input.userId },
        data: { balance: { decrement: input.amount } },
      });

      await tx.withdrawalRequest.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          method: input.method as PrismaWithdrawMethod,
          expressPhone: input.expressPhone?.trim(),
          iban: input.iban?.trim(),
          bankName: input.bankName?.trim(),
          status: TransactionStatus.COMPLETED,
          reference: input.reference,
          processedAt: new Date(),
        },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          userId: input.userId,
          type: TransactionType.WITHDRAWAL,
          amount: -input.amount,
          title: input.title,
          status: TransactionStatus.COMPLETED,
          reference: input.reference,
          meta: {
            method: input.method,
            expressPhone: input.expressPhone,
            iban: input.iban,
            bankName: input.bankName,
          },
        },
      });

      return { updated, ledger };
    });

    return {
      balanceAfter: result.updated.balance,
      transaction: this.mapTx(result.ledger),
    };
  }
}
