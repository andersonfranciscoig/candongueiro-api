import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException } from "../../../../shared/domain/exceptions/domain.exception";
import {
  EXPRESS_ENTITY,
  nextTopUpReference,
} from "../../../../shared/domain/utils/reference";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/repositories/wallet.repository";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import type { CreateTopUpRequestDto } from "../dto/wallet.dto";

@Injectable()
export class CreateTopUpRequestUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallet: WalletRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly mail: MailService,
  ) {}

  async execute(userId: string, dto: CreateTopUpRequestDto) {
    if (dto.amount <= 0) throw new BadRequestException("Informe um valor válido.");

    const user = await this.users.findById(userId);
    const reference = nextTopUpReference();
    const request = await this.wallet.createTopUpRequest(userId, {
      amount: dto.amount,
      entity: EXPRESS_ENTITY,
      reference,
    });

    if (user) {
      this.mail.sendTopUpRequest({
        email: user.email.value,
        name: user.name,
        amount: request.amount,
        entity: request.entity,
        reference: request.reference,
      });
    }

    return {
      id: request.id,
      amount: request.amount,
      entity: request.entity,
      reference: request.reference,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    };
  }
}
