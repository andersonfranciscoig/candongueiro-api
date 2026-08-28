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

  sendWelcomeConductor(input: { email: string; name: string }) {
    const rendered = T.authWelcomeConductor({
      name: input.name,
      dashboardUrl: `${this.frontendUrl}/cobrador`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["auth", "welcome", "conductor"]),
      "auth.welcome-conductor",
    );
  }

  sendNotificationMirror(input: {
    email: string;
    name: string;
    headline: string;
    message: string;
    preview?: string;
    emoji?: string;
    details?: Array<{ label: string; value: string }>;
    dashboardUrl?: string;
    ctaLabel?: string;
    tags: string[];
  }) {
    const rendered = T.opsGenericAlert({
      name: input.name,
      preview: input.preview ?? input.headline,
      headline: input.headline,
      message: input.message,
      emoji: input.emoji,
      details: input.details,
      ctaUrl: input.dashboardUrl,
      ctaLabel: input.ctaLabel,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, input.tags),
      `notification.${input.tags.join(".")}`,
    );
  }

  sendConductorPaymentToConfirm(input: {
    email: string;
    name: string;
    amount: number;
    vehiclePlate: string;
    reference: string;
    occurredAt: string;
  }) {
    const rendered = T.opsPaymentToConfirm({
      ...input,
      dashboardUrl: `${this.frontendUrl}/cobrador/pagamentos`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["conductor", "payment-pending"]),
      "conductor.payment-pending",
    );
  }

  sendSessionResponse(input: {
    email: string;
    name: string;
    accepted: boolean;
    conductorName?: string;
  }) {
    const rendered = T.opsSessionResponse({
      name: input.name,
      accepted: input.accepted,
      conductorName: input.conductorName,
      dashboardUrl: `${this.frontendUrl}/motorista/turno`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, [
        "session",
        input.accepted ? "accepted" : "rejected",
      ]),
      "session.response",
    );
  }

  sendSessionEnded(input: {
    email: string;
    name: string;
    driverName: string;
    vehiclePlate: string;
  }) {
    const rendered = T.opsSessionEnded({
      name: input.name,
      driverName: input.driverName,
      vehiclePlate: input.vehiclePlate,
      dashboardUrl: `${this.frontendUrl}/cobrador`,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["session", "ended"]),
      "session.ended",
    );
  }

  sendPayoutNotification(input: {
    email: string;
    name: string;
    headline: string;
    message: string;
    amount?: number;
    role: "DRIVER" | "CONDUCTOR";
    ctaLabel?: string;
  }) {
    const dashboardUrl =
      input.role === "DRIVER"
        ? `${this.frontendUrl}/motorista/cobradores`
        : `${this.frontendUrl}/cobrador/pagamentos`;
    const rendered = T.opsPayoutAlert({
      name: input.name,
      headline: input.headline,
      message: input.message,
      amount: input.amount,
      dashboardUrl,
      ctaLabel: input.ctaLabel,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["payout", input.role.toLowerCase()]),
      "payout.notification",
    );
  }

  sendRefundNotification(input: {
    email: string;
    name: string;
    headline: string;
    message: string;
    amount: number;
    paymentReference: string;
    role: "DRIVER" | "CONDUCTOR";
  }) {
    const dashboardUrl =
      input.role === "DRIVER"
        ? `${this.frontendUrl}/motorista/recebimentos`
        : `${this.frontendUrl}/cobrador/pagamentos`;
    const rendered = T.opsRefundAlert({
      name: input.name,
      headline: input.headline,
      message: input.message,
      amount: input.amount,
      paymentReference: input.paymentReference,
      dashboardUrl,
    });
    this.dispatch(
      this.send({ email: input.email, name: input.name }, rendered, ["refund", input.role.toLowerCase()]),
      "refund.notification",
    );
  }
}
