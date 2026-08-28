import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomInt } from "crypto";
import { ConfigService } from "@nestjs/config";
import { ConflictException, NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { Email } from "../../../../shared/domain/value-objects/email.vo";
import {
  OTP_CHALLENGE_REPOSITORY,
  type OtpChallengeRepository,
} from "../../domain/repositories/otp-challenge.repository";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { OTP_SENDER, type OtpSenderPort } from "../ports/otp-sender.port";
import type { RequestOtpDto } from "../dto/auth.dto";

@Injectable()
export class RequestOtpUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly otpChallenges: OtpChallengeRepository,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSenderPort,
  ) {}

  async execute(dto: RequestOtpDto) {
    const email = new Email(dto.email).value;
    const existing = await this.users.findByEmail(email);

    if (dto.flow === "register" && existing) {
      throw new ConflictException("Já existe uma conta com este email.");
    }
    if (dto.flow === "login" && !existing) {
      throw new NotFoundException("Conta");
    }

    const ttl = Number(this.config.get("OTP_TTL_SECONDS") ?? 300);
    const devCode = this.config.get<string>("OTP_DEV_CODE");
    const code = devCode || String(randomInt(100000, 999999));
    const codeHash = createHash("sha256").update(code).digest("hex");

    await this.otpChallenges.create({
      email,
      userId: existing?.id,
      codeHash,
      purpose: dto.flow,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    await this.otpSender.send(email, code, dto.flow);

    return {
      email,
      expiresIn: ttl,
      ...(this.config.get("NODE_ENV") === "development" ? { devCode: code } : {}),
    };
  }
}
