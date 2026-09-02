import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { MailModule } from "../mail/mail.module";
import { WALLET_REPOSITORY } from "./domain/repositories/wallet.repository";
import { WalletController } from "./infrastructure/http/controllers/wallet.controller";
import { PrismaWalletRepository } from "./infrastructure/persistence/prisma/prisma-wallet.repository";
import { ConfirmTopUpUseCase } from "./application/use-cases/confirm-topup.use-case";
import { CreateTopUpRequestUseCase } from "./application/use-cases/create-topup-request.use-case";
import { GetWalletMetricsUseCase } from "./application/use-cases/get-wallet-metrics.use-case";
import { GetWalletUseCase } from "./application/use-cases/get-wallet.use-case";
import { PayTripUseCase } from "./application/use-cases/pay-trip.use-case";
import {
  CreateTripPaymentRequestUseCase,
  ListMyTripPaymentRequestsUseCase,
  LookupTripPaymentRequestsUseCase,
  PayTripPaymentRequestUseCase,
  RejectTripPaymentRequestUseCase,
} from "./application/use-cases/trip-payment-request.use-cases";
import { WithdrawUseCase } from "./application/use-cases/withdraw.use-case";

import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [IdentityModule, MailModule, NotificationsModule],
  controllers: [WalletController],
  providers: [
    GetWalletUseCase,
    GetWalletMetricsUseCase,
    CreateTopUpRequestUseCase,
    ConfirmTopUpUseCase,
    PayTripUseCase,
    WithdrawUseCase,
    CreateTripPaymentRequestUseCase,
    LookupTripPaymentRequestsUseCase,
    ListMyTripPaymentRequestsUseCase,
    PayTripPaymentRequestUseCase,
    RejectTripPaymentRequestUseCase,
    { provide: WALLET_REPOSITORY, useClass: PrismaWalletRepository },
  ],
})
export class WalletModule {}
