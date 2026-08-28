import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomInt } from "crypto";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { hashPin, isValidPinFormat, verifyPinHash } from "../../../../shared/domain/utils/pin-hash";
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
import type { ChangePinDto } from "../dto/auth.dto";

const PIN_CHANGE_PURPOSE = "pin_change";

@Injectable()
export class RequestPinChangeOtpUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSenderPort,
  ) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    const email = user.email.value;
    const ttl = Number(this.config.get("OTP_TTL_SECONDS") ?? 300);
    const devCode = this.config.get<string>("OTP_DEV_CODE");
    const code = devCode || String(randomInt(100000, 999999));
    const codeHash = createHash("sha256").update(code).digest("hex");

    await this.otpChallenges.create({
      email,
      userId: user.id,
      codeHash,
      purpose: PIN_CHANGE_PURPOSE,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    await this.otpSender.send(email, code, PIN_CHANGE_PURPOSE);

    return {
      email,
      expiresIn: ttl,
      ...(this.config.get("NODE_ENV") === "development" ? { devCode: code } : {}),
    };
  }
}

@Injectable()
export class ChangePinUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
  ) {}

  async execute(userId: string, dto: ChangePinDto) {
    if (!isValidPinFormat(dto.currentPin) || !isValidPinFormat(dto.newPin)) {
      throw new BadRequestException("O PIN deve ter 6 dígitos.");
    }
    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException("O novo PIN deve ser diferente do actual.");
    }

    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    const codeHash = createHash("sha256").update(dto.code).digest("hex");
    const challenge = await this.otpChallenges.findValid({
      email: user.email.value,
      purpose: PIN_CHANGE_PURPOSE,
      codeHash,
    });
    if (!challenge) {
      throw new UnauthorizedException("Código de verificação inválido ou expirado.");
    }

    const auth = await this.users.findAuthById(userId);
    if (!auth?.pinHash || !verifyPinHash(dto.currentPin, auth.pinHash)) {
      throw new UnauthorizedException("PIN actual incorrecto.");
    }

    await this.otpChallenges.consume(challenge.id);
    await this.users.setPinHash(userId, hashPin(dto.newPin));

    return { ok: true };
  }
}
