import { Inject, Injectable } from "@nestjs/common";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/repositories/wallet.repository";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import type { ConfirmTopUpDto } from "../dto/wallet.dto";

const LOW_BALANCE_THRESHOLD = 2_000;

@Injectable()
export class ConfirmTopUpUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallet: WalletRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly mail: MailService,
  ) {}

  async execute(userId: string, dto: ConfirmTopUpDto) {
    const result = await this.wallet.confirmTopUp(userId, dto.reference);
    const user = await this.users.findById(userId);

    if (user) {
      this.mail.sendTopUpConfirmed({
        email: user.email.value,
        name: user.name,
        amount: result.transaction.amount,
        balanceAfter: result.balanceAfter,
        reference: result.transaction.reference,
        occurredAt: result.transaction.createdAt.toISOString(),
      });

      if (result.balanceAfter <= LOW_BALANCE_THRESHOLD) {
        this.mail.sendLowBalance({
          email: user.email.value,
          name: user.name,
          balance: result.balanceAfter,
        });
      }
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
        createdAt: result.transaction.createdAt.toISOString(),
      },
    };
  }
}
