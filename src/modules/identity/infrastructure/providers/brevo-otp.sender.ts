import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "../../../../shared/domain/exceptions/domain.exception";
import type { OtpSenderPort } from "../../application/ports/otp-sender.port";
import { MailService } from "../../../mail/application/mail.service";
import { ConsoleOtpSender } from "./console-otp.sender";

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const cause = (error as Error & { cause?: unknown }).cause;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code: string }).code)
      : "";

  return (
    error.message === "fetch failed" ||
    code.startsWith("UND_ERR_") ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND"
  );
}

@Injectable()
export class BrevoOtpSender implements OtpSenderPort {
  private readonly logger = new Logger(BrevoOtpSender.name);

  constructor(
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly consoleSender: ConsoleOtpSender,
  ) {}

  async send(email: string, code: string, purpose: string): Promise<void> {
    const flow = purpose === "login" ? "login" : "register";
    const ttlSeconds = Number(this.config.get("OTP_TTL_SECONDS") ?? 300);
    const expiresMinutes = Math.max(1, Math.round(ttlSeconds / 60));

    try {
      await this.mailService.sendOtp({
        email,
        otp: code,
        expiresMinutes,
        flow,
      });
    } catch (error) {
      const isDev = this.config.get("NODE_ENV") !== "production";

      if (isDev && isNetworkError(error)) {
        this.logger.warn(
          "Brevo indisponível (rede) — OTP registado no console. Ver docs/EMAIL_BREVO.md",
        );
        await this.consoleSender.send(email, code, purpose);
        return;
      }

      this.logger.error("Falha ao enviar OTP por email", error);
      throw new BadRequestException(
        "Não foi possível enviar o código por email. Tente novamente em instantes.",
      );
    }
  }
}
