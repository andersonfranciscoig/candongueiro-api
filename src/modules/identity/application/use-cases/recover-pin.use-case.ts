import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomInt } from "crypto";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { Email } from "../../../../shared/domain/value-objects/email.vo";
import { hashPin, isValidPinFormat } from "../../../../shared/domain/utils/pin-hash";
import {
  OTP_CHALLENGE_REPOSITORY,
  type OtpChallengeRepository,
} from "../../domain/repositories/otp-challenge.repository";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { OTP_SENDER, type OtpSenderPort } from "../ports/otp-sender.port";
import {
  BadRequestException,
  UnauthorizedException,
} from "../../../../shared/domain/exceptions/domain.exception";
import type { RecoverPinDto, RequestRecoverOtpDto } from "../dto/auth.dto";

export const RECOVER_PIN_PURPOSE = "recover_pin";

@Injectable()
export class RequestRecoverOtpUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSenderPort,
  ) {}

  async execute(dto: RequestRecoverOtpDto) {
    const email = new Email(dto.email).value;
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new NotFoundException("Conta");
    }

    const ttl = Number(this.config.get("OTP_TTL_SECONDS") ?? 300);
    const devCode = this.config.get<string>("OTP_DEV_CODE");
    const code = devCode || String(randomInt(100000, 999999));
    const codeHash = createHash("sha256").update(code).digest("hex");

    await this.otpChallenges.create({
      email,
      userId: user.id,
      codeHash,
      purpose: RECOVER_PIN_PURPOSE,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    await this.otpSender.send(email, code, RECOVER_PIN_PURPOSE);

    return {
      email,
      expiresIn: ttl,
      ...(this.config.get("NODE_ENV") === "development" ? { devCode: code } : {}),
    };
  }
}

@Injectable()
export class RecoverPinUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
  ) {}

  async execute(dto: RecoverPinDto) {
    if (!isValidPinFormat(dto.newPin)) {
      throw new BadRequestException("O código secreto deve ter 6 dígitos.");
    }

    const email = new Email(dto.email).value;
    const codeHash = createHash("sha256").update(dto.code).digest("hex");
    const challenge = await this.otpChallenges.findValid({
      email,
      purpose: RECOVER_PIN_PURPOSE,
      codeHash,
    });
    if (!challenge) {
      throw new UnauthorizedException("Código inválido ou expirado.");
    }

    const user = await this.users.findByEmail(email);
    if (!user) throw new NotFoundException("Conta");

    await this.otpChallenges.consume(challenge.id);
    await this.users.setPinHash(user.id, hashPin(dto.newPin));

    return { ok: true };
  }
}
