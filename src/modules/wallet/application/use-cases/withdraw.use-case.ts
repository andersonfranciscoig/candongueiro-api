import { Inject, Injectable } from "@nestjs/common";
import { WithdrawMethod } from "../../../../shared/domain/types/enums";
import {
  BadRequestException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { nextLedgerReference } from "../../../../shared/domain/utils/reference";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/repositories/wallet.repository";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import type { WithdrawDto } from "../dto/wallet.dto";

@Injectable()
export class WithdrawUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallet: WalletRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly mail: MailService,
  ) {}

  async execute(userId: string, dto: WithdrawDto) {
    if (dto.amount <= 0) throw new BadRequestException("Informe um valor válido.");

    if (dto.method === WithdrawMethod.EXPRESS && !dto.expressPhone?.trim()) {
      throw new BadRequestException("Indique o número Multicaixa Express.");
    }
    if (dto.method === WithdrawMethod.IBAN) {
      if (!dto.iban?.trim() || !dto.bankName?.trim()) {
        throw new BadRequestException("Indique o IBAN e o nome do banco.");
      }
    }

    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    const txCount = await this.wallet.countTransactions();
    const title =
      dto.method === WithdrawMethod.EXPRESS
        ? "Levantamento · Multicaixa Express"
        : "Levantamento · Transferência IBAN";

    const result = await this.wallet.withdraw({
      userId,
      amount: dto.amount,
      method: dto.method,
      expressPhone: dto.expressPhone,
      iban: dto.iban,
      bankName: dto.bankName,
      reference: nextLedgerReference(txCount),
      title,
    });

    const destination =
      dto.method === WithdrawMethod.EXPRESS
        ? (dto.expressPhone?.trim() ?? user.phone.value)
        : `${dto.bankName?.trim()} · ${dto.iban?.trim()}`;

    this.mail.sendWithdrawalConfirmed({
      email: user.email.value,
      name: user.name,
      amount: dto.amount,
      balanceAfter: result.balanceAfter,
      method: dto.method,
      reference: result.transaction.reference,
      destination,
      occurredAt: result.transaction.createdAt.toISOString(),
    });

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
