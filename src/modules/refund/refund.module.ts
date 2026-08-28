import { Module } from "@nestjs/common";
import { AuthModule } from "../../shared/infrastructure/auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RefundController } from "./infrastructure/http/controllers/refund.controller";
import {
  DecideRefundUseCase,
  ListRefundsUseCase,
  RequestRefundUseCase,
} from "./application/use-cases/refund.use-cases";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [RefundController],
  providers: [RequestRefundUseCase, DecideRefundUseCase, ListRefundsUseCase],
})
export class RefundModule {}
