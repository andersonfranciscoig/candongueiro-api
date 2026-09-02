import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../../shared/infrastructure/auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ConductorModule } from "../conductor/conductor.module";
import { WorkSessionController } from "./infrastructure/http/controllers/work-session.controller";
import {
  CreateWorkSessionUseCase,
  EndWorkSessionUseCase,
  GetActiveWorkSessionUseCase,
  GetWorkSessionUseCase,
  ListAvailableConductorsUseCase,
  ListPendingSessionRequestsUseCase,
  RespondSessionRequestUseCase,
  UpdateWorkSessionUseCase,
} from "./application/use-cases/work-session.use-cases";

@Module({
  imports: [AuthModule, MailModule, NotificationsModule, forwardRef(() => ConductorModule)],
  controllers: [WorkSessionController],
  providers: [
    CreateWorkSessionUseCase,
    GetActiveWorkSessionUseCase,
    GetWorkSessionUseCase,
    UpdateWorkSessionUseCase,
    EndWorkSessionUseCase,
    RespondSessionRequestUseCase,
    ListAvailableConductorsUseCase,
    ListPendingSessionRequestsUseCase,
  ],
  exports: [
    GetActiveWorkSessionUseCase,
  ],
})
export class WorkSessionModule {}
