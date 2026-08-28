import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MAIL_PORT, type MailPort } from "./ports/mail.port";
import * as T from "../templates";
import {
  WELCOME_BONUS_PASSENGER_LIMIT,
} from "../../promotions/welcome-bonus.constants";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;

  constructor(
    @Inject(MAIL_PORT) private readonly mail: MailPort,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>("FRONTEND_URL") ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );
  }

  private dispatch(promise: Promise<void>, context: string) {
    void promise.catch((err) =>
      this.logger.error(
        `Mail failed (${context}): ${err instanceof Error ? err.message : err}`,
      ),
    );
  }

  private send(
    to: { email: string; name?: string },
    rendered: T.RenderedEmail,
    tags: string[],
  ) {
    return this.mail.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: ["candongueiropay", ...tags],
    });
  }

  /** Envia email OTP (síncrono — falha propagada ao caller). */
  async sendOtp(input: {
    email: string;
    name?: string;
    otp: string;
    expiresMinutes: number;
    flow: "login" | "register";
  }) {
    const rendered = T.authVerifyOtp({
      name: input.name,
      otp: input.otp,
      expiresMinutes: input.expiresMinutes,
      flow: input.flow,
    });
    await this.send({ email: input.email, name: input.name }, rendered, ["auth", "otp", input.flow]);
  }

  sendWelcomePassenger(input: { email: string; name: string }) {
    const rendered = T.authWelcomePassenger({
      name: input.name,
      dashboardUrl: `${this.frontendUrl}/app`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["auth", "welcome", "passenger"]),
      "auth.welcome-passenger",
    );
  }

  sendWelcomeDriver(input: { email: string; name: string; vehiclePlate?: string }) {
    const rendered = T.authWelcomeDriver({
      name: input.name,
      dashboardUrl: `${this.frontendUrl}/motorista`,
      vehiclePlate: input.vehiclePlate,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["auth", "welcome", "driver"]),
      "auth.welcome-driver",
    );
  }

  sendTopUpRequest(input: {
    email: string;
    name: string;
    amount: number;
    entity: string;
    reference: string;
  }) {
    const rendered = T.walletTopUpRequest({
      amount: input.amount,
      entity: input.entity,
      reference: input.reference,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "topup-request"]),
      "wallet.topup-request",
    );
  }

  sendTopUpConfirmed(input: {
    email: string;
    name: string;
    amount: number;
    balanceAfter: number;
    reference: string;
    occurredAt: string;
  }) {
    const rendered = T.walletTopUpConfirmed(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "topup-confirmed"]),
      "wallet.topup-confirmed",
    );
  }

  sendPaymentSent(input: {
    email: string;
    name: string;
    amount: number;
    balanceAfter: number;
    vehiclePlate: string;
    reference: string;
    occurredAt: string;
  }) {
    const rendered = T.walletPaymentSent(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "payment-sent"]),
      "wallet.payment-sent",
    );
  }

  sendPaymentReceived(input: {
    email: string;
    name: string;
    amount: number;
    balanceAfter: number;
    vehiclePlate: string;
    reference: string;
    occurredAt: string;
  }) {
    const rendered = T.walletPaymentReceived(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "payment-received"]),
      "wallet.payment-received",
    );
  }

  sendWithdrawalConfirmed(input: {
    email: string;
    name: string;
    amount: number;
    balanceAfter: number;
    method: "EXPRESS" | "IBAN";
    reference: string;
    destination: string;
    occurredAt: string;
  }) {
    const rendered = T.walletWithdrawalConfirmed(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "withdrawal"]),
      "wallet.withdrawal",
    );
  }

  sendLowBalance(input: { email: string; name: string; balance: number }) {
    const rendered = T.walletLowBalance({
      name: input.name,
      balance: input.balance,
      topUpUrl: `${this.frontendUrl}/app/carregar`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["wallet", "low-balance"]),
      "wallet.low-balance",
    );
  }

  sendProfileUpdated(input: {
    email: string;
    name: string;
    changedFields: string[];
    occurredAt: string;
  }) {
    const rendered = T.profileUpdated(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["profile", "updated"]),
      "profile.updated",
    );
  }

  sendSecurityNewLogin(input: {
    email: string;
    name: string;
    occurredAt: string;
    deviceHint?: string;
  }) {
    const rendered = T.securityNewLogin(input);
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["security", "login"]),
      "security.new-login",
    );
  }

  sendVehicleRegistered(input: {
    email: string;
    name: string;
    plate: string;
    model?: string;
    qrCode: string;
    occurredAt: string;
  }) {
    const rendered = T.vehicleRegistered({
      ...input,
      dashboardUrl: `${this.frontendUrl}/motorista/qr`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["vehicle", "registered"]),
      "vehicle.registered",
    );
  }

  sendWelcomeBonus(input: {
    email: string;
    name: string;
    amount: number;
    rank: number;
    balanceAfter: number;
    occurredAt: string;
  }) {
    const rendered = T.promoWelcomeBonus({
      name: input.name,
      amount: input.amount,
      rank: input.rank,
      balanceAfter: input.balanceAfter,
      limit: WELCOME_BONUS_PASSENGER_LIMIT,
      dashboardUrl: `${this.frontendUrl}/app`,
      occurredAt: input.occurredAt,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, [
        "promo",
        "welcome-bonus",
      ]),
      "promo.welcome-bonus",
    );
  }

  sendConductorInvite(input: { email: string; driverName: string; registerUrl: string }) {
    const rendered = T.authConductorInvite({
      driverName: input.driverName,
      registerUrl: input.registerUrl,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.email }, rendered, ["conductor", "invite"]),
      "conductor.invite",
    );
  }

  sendConductorSessionRequest(input: {
    email: string;
    conductorName: string;
    driverName: string;
    vehiclePlate: string;
    startAt: string;
    endAt: string;
  }) {
    const rendered = T.authConductorSessionRequest(input);
    this.dispatch(
      this.send({ email: input.email, name: input.conductorName }, rendered, [
        "conductor",
        "session-request",
      ]),
      "conductor.session-request",
    );
  }
}
