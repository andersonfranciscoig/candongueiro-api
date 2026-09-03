import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { Role } from "../../../../shared/domain/types/enums";
import {
  BadRequestException,
  UnauthorizedException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Email } from "../../../../shared/domain/value-objects/email.vo";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { hashPin, isValidPinFormat } from "../../../../shared/domain/utils/pin-hash";
import {
  OTP_CHALLENGE_REPOSITORY,
  type OtpChallengeRepository,
} from "../../domain/repositories/otp-challenge.repository";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { TOKEN_SERVICE, type TokenServicePort } from "../ports/token.port";
import { MailService } from "../../../mail/application/mail.service";
import { WelcomeBonusService } from "../../../promotions/welcome-bonus.service";
import type { VerifyOtpDto } from "../dto/auth.dto";

export type WelcomeBonusPayload = {
  amount: number;
  rank: number;
  notificationId: string;
};

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly mail: MailService,
    private readonly welcomeBonus: WelcomeBonusService,
  ) {}

  async execute(dto: VerifyOtpDto) {
    const email = new Email(dto.email).value;
    const codeHash = createHash("sha256").update(dto.code).digest("hex");

    const challenge = await this.otpChallenges.findValid({
      email,
      purpose: dto.flow,
      codeHash,
    });

    if (!challenge) {
      throw new UnauthorizedException("Código OTP inválido ou expirado.");
    }

    await this.otpChallenges.consume(challenge.id);

    let user = await this.users.findByEmail(email);
    const isNewUser = dto.flow === "register";
    let welcomeBonus: WelcomeBonusPayload | null = null;

    if (isNewUser) {
      if (user) throw new UnauthorizedException("Conta já existe.");
      if (!dto.name || !dto.phone || !dto.role) {
        throw new UnauthorizedException("Nome, telefone e papel são obrigatórios no registo.");
      }
      if (!dto.pin || !isValidPinFormat(dto.pin)) {
        throw new BadRequestException("Defina um código secreto de 6 dígitos.");
      }

      const phone = new Phone(dto.phone).value;
      user = await this.users.create({
        name: dto.name,
        email,
        phone,
        role: dto.role,
        balance: 0,
        pinHash: hashPin(dto.pin),
      });

      if (dto.role === Role.PASSENGER) {
        const bonus = await this.welcomeBonus.tryGrantPassengerBonus(user.id);
        if (bonus.granted) {
          welcomeBonus = {
            amount: bonus.amount,
            rank: bonus.rank,
            notificationId: bonus.notificationId,
          };
          user = (await this.users.findById(user.id))!;

          const occurredAt = new Date().toISOString();
          this.mail.sendWelcomeBonus({
            email,
            name: user.name,
            amount: bonus.amount,
            rank: bonus.rank,
            balanceAfter: bonus.balanceAfter,
            occurredAt,
          });
        }

        this.mail.sendWelcomePassenger({
          email,
          name: user.name,
        });
      } else {
        this.mail.sendWelcomeDriver({
          email,
          name: user.name,
        });
      }
    }

    if (!user) throw new UnauthorizedException("Conta não encontrada.");

    const accessToken = await this.tokens.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    if (!isNewUser) {
      this.mail.sendSecurityNewLogin({
        email: user.email.value,
        name: user.name,
        occurredAt: new Date().toISOString(),
      });
    }

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        phone: user.phone.value,
        role: user.role,
        homeRole: user.homeRole,
        balance: user.balance,
        createdAt: user.createdAt.toISOString(),
        switchableRoles: user.switchableRoles(),
      },
      welcomeBonus,
    };
  }
}
