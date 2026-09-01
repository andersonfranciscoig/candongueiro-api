import { Logger, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "../../shared/infrastructure/auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { USER_REPOSITORY } from "./domain/repositories/user.repository";
import { OTP_CHALLENGE_REPOSITORY } from "./domain/repositories/otp-challenge.repository";
import { OTP_SENDER } from "./application/ports/otp-sender.port";
import { TOKEN_SERVICE } from "./application/ports/token.port";
import { RequestOtpUseCase } from "./application/use-cases/request-otp.use-case";
import { VerifyOtpUseCase } from "./application/use-cases/verify-otp.use-case";
import { LoginWithPinUseCase } from "./application/use-cases/login-with-pin.use-case";
import {
  ChangePinUseCase,
  RequestPinChangeOtpUseCase,
} from "./application/use-cases/change-pin.use-case";
import {
  RecoverPinUseCase,
  RequestRecoverOtpUseCase,
} from "./application/use-cases/recover-pin.use-case";
import { PromotionsModule } from "../promotions/promotions.module";
import { PinVerificationService } from "./application/services/pin-verification.service";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma/prisma-user.repository";
import { PrismaOtpChallengeRepository } from "./infrastructure/persistence/prisma/prisma-otp-challenge.repository";
import { ConsoleOtpSender } from "./infrastructure/providers/console-otp.sender";
import { BrevoOtpSender } from "./infrastructure/providers/brevo-otp.sender";
import { JwtTokenService } from "./infrastructure/providers/jwt-token.service";
import { AuthController } from "./infrastructure/http/controllers/auth.controller";
import { ProfileController } from "./infrastructure/http/controllers/profile.controller";
import { GetProfileUseCase, UpdateProfileUseCase } from "./application/use-cases/profile.use-case";

@Module({
  imports: [
    AuthModule,
    MailModule,
    PromotionsModule,
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
  controllers: [AuthController, ProfileController],
  providers: [
    RequestOtpUseCase,
    VerifyOtpUseCase,
    LoginWithPinUseCase,
    RequestPinChangeOtpUseCase,
    ChangePinUseCase,
    RequestRecoverOtpUseCase,
    RecoverPinUseCase,
    PinVerificationService,
    GetProfileUseCase,
    UpdateProfileUseCase,
    ConsoleOtpSender,
    BrevoOtpSender,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: OTP_CHALLENGE_REPOSITORY, useClass: PrismaOtpChallengeRepository },
    {
      provide: OTP_SENDER,
      inject: [ConfigService, ConsoleOtpSender, BrevoOtpSender],
      useFactory: (
        config: ConfigService,
        console: ConsoleOtpSender,
        brevo: BrevoOtpSender,
      ) => {
        const provider = (config.get<string>("EMAIL_PROVIDER") ?? "console")
          .trim()
          .toLowerCase();
        if (provider === "brevo" && config.get<string>("EMAIL_API_KEY")?.trim()) {
          return brevo;
        }
        if (provider === "brevo") {
          Logger.warn(
            "EMAIL_PROVIDER=brevo mas EMAIL_API_KEY em falta — OTP via console",
            "IdentityModule",
          );
        }
        return console;
      },
    },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [USER_REPOSITORY, PinVerificationService],
})
export class IdentityModule {}
