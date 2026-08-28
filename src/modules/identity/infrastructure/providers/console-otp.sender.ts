import { Injectable, Logger } from "@nestjs/common";
import type { OtpSenderPort } from "../../application/ports/otp-sender.port";

/** Provider mock — em produção substitui por SMTP/SendGrid/etc. */
@Injectable()
export class ConsoleOtpSender implements OtpSenderPort {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  async send(email: string, code: string, purpose: string) {
    this.logger.log(`[OTP:${purpose}] ${email} → ${code}`);
  }
}
