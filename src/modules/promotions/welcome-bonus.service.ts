import { Injectable } from "@nestjs/common";
import { Role, TransactionStatus, TransactionType } from "@prisma/client";
import { PrismaService } from "../../shared/infrastructure/persistence/prisma/prisma.service";
import {
  WELCOME_BONUS_AMOUNT,
  WELCOME_BONUS_PASSENGER_LIMIT,
  type WelcomeBonusResult,
} from "./welcome-bonus.constants";

@Injectable()
export class WelcomeBonusService {
  constructor(private readonly prisma: PrismaService) {}

  async tryGrantPassengerBonus(userId: string): Promise<WelcomeBonusResult> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== Role.PASSENGER) {
        return { granted: false };
      }

      const alreadyGranted = await tx.ledgerTransaction.findFirst({
        where: {
          userId,
          type: TransactionType.BONUS,
        },
      });
      if (alreadyGranted) {
        return { granted: false };
      }

      const grantedCount = await tx.ledgerTransaction.count({
        where: {
          type: TransactionType.BONUS,
          reference: { startsWith: "BONUS-WELCOME-" },
        },
      });

      if (grantedCount >= WELCOME_BONUS_PASSENGER_LIMIT) {
        return { granted: false };
      }

      const rank = grantedCount + 1;
      const reference = `BONUS-WELCOME-${String(rank).padStart(3, "0")}`;

      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: WELCOME_BONUS_AMOUNT } },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId,
          type: TransactionType.BONUS,
          amount: WELCOME_BONUS_AMOUNT,
          title: "Bónus de boas-vindas",
          status: TransactionStatus.COMPLETED,
          reference,
          meta: {
            kind: "welcome_bonus",
            rank,
            amount: WELCOME_BONUS_AMOUNT,
          },
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId,
          type: "WELCOME_BONUS",
          title: "Bónus de boas-vindas",
          body: `Recebeu ${WELCOME_BONUS_AMOUNT.toLocaleString("pt-AO")} Kz por ser um dos primeiros ${WELCOME_BONUS_PASSENGER_LIMIT} passageiros CandongueiroPay.`,
          meta: {
            amount: WELCOME_BONUS_AMOUNT,
            rank,
            reference,
          },
        },
      });

      return {
        granted: true,
        amount: WELCOME_BONUS_AMOUNT,
        rank,
        balanceAfter: updated.balance,
        notificationId: notification.id,
        reference,
      };
    });
  }
}
