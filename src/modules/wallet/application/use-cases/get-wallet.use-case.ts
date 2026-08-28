import { Inject, Injectable } from "@nestjs/common";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from "../../domain/repositories/wallet.repository";

@Injectable()
export class GetWalletUseCase {
  constructor(@Inject(WALLET_REPOSITORY) private readonly wallet: WalletRepository) {}

  async execute(userId: string) {
    const snapshot = await this.wallet.getSnapshot(userId);
    if (!snapshot) throw new NotFoundException("Utilizador");

    return {
      balance: snapshot.balance,
      currency: "AOA",
      transactions: snapshot.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        title: tx.title,
        status: tx.status,
        reference: tx.reference,
        vehiclePlate: tx.vehiclePlate ?? undefined,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }
}
