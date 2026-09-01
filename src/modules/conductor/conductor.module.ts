import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "../../shared/infrastructure/auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TOKEN_SERVICE } from "../identity/application/ports/token.port";
import { JwtTokenService } from "../identity/infrastructure/providers/jwt-token.service";
import { ConductorController } from "./infrastructure/http/controllers/conductor.controller";
import {
  CheckConductorInviteUseCase,
  ConfirmPaymentUseCase,
  DecideConductorWithdrawUseCase,
  GetConductorDashboardUseCase,
  InviteConductorUseCase,
  RegisterConductorUseCase,
  RequestConductorWithdrawUseCase,
} from "./application/use-cases/conductor.use-cases";
import {
  AddFixedConductorUseCase,
  ConfirmConductorPayoutUseCase,
  CreateConductorPayoutUseCase,
  DeactivateConductorRelationUseCase,
  DiscoverConductorsUseCase,
  ListConductorPayoutsUseCase,
  ListDriverConductorsV2UseCase,
  RegisterConductorStandaloneUseCase,
  SetConductorAvailabilityUseCase,
  TriggerScheduledPayoutsUseCase,
} from "./application/use-cases/conductor-v2.use-cases";

@Module({
  imports: [
    AuthModule,
    MailModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET") ?? "dev",
        signOptions: {
          expiresIn: (config.get<string>("JWT_EXPIRES_IN") ?? "7d") as any,
        },
      }),
    }),
  ],
  controllers: [ConductorController],
  providers: [
    InviteConductorUseCase,
    CheckConductorInviteUseCase,
    RegisterConductorUseCase,
    RegisterConductorStandaloneUseCase,
    SetConductorAvailabilityUseCase,
    AddFixedConductorUseCase,
    DiscoverConductorsUseCase,
    DeactivateConductorRelationUseCase,
    ListDriverConductorsV2UseCase,
    CreateConductorPayoutUseCase,
    ConfirmConductorPayoutUseCase,
    ListConductorPayoutsUseCase,
    TriggerScheduledPayoutsUseCase,
    GetConductorDashboardUseCase,
    ConfirmPaymentUseCase,
    RequestConductorWithdrawUseCase,
    DecideConductorWithdrawUseCase,
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [
    TriggerScheduledPayoutsUseCase,
  ],
})
export class ConductorModule {}
