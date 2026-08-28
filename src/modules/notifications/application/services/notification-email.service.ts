import { Injectable, Logger } from "@nestjs/common";
import { Role } from "@prisma/client";
import { MailService } from "../../../mail/application/mail.service";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationType } from "../../domain/notification-types";

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Envia email correspondente à notificação in-app (fire-and-forget). */
  dispatch(
    userId: string,
    type: string,
    title: string,
    body: string,
    meta?: Record<string, unknown>,
  ): void {
    void this.dispatchAsync(userId, type, title, body, meta).catch((err) =>
      this.logger.warn(
        `Email notification skipped (${type}): ${err instanceof Error ? err.message : err}`,
      ),
    );
  }

  private async dispatchAsync(
    userId: string,
    type: string,
    title: string,
    body: string,
    meta?: Record<string, unknown>,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    const amount = typeof meta?.amount === "number" ? meta.amount : undefined;
    const reference = typeof meta?.reference === "string" ? meta.reference : undefined;
    const vehiclePlate = typeof meta?.vehiclePlate === "string" ? meta.vehiclePlate : "—";
    const paymentReference =
      typeof meta?.paymentReference === "string" ? meta.paymentReference : reference ?? "—";
    const occurredAt =
      typeof meta?.occurredAt === "string" ? meta.occurredAt : new Date().toISOString();

    switch (type) {
      case NotificationType.PAYMENT_RECEIVED:
        if (user.role === Role.CONDUCTOR && amount && reference) {
          this.mail.sendConductorPaymentToConfirm({
            email: user.email,
            name: user.name,
            amount,
            vehiclePlate,
            reference,
            occurredAt,
          });
        } else if (user.role === Role.DRIVER && amount && reference) {
          this.mail.sendPaymentReceived({
            email: user.email,
            name: user.name,
            amount,
            balanceAfter: typeof meta?.balanceAfter === "number" ? meta.balanceAfter : 0,
            vehiclePlate,
            reference,
            occurredAt,
          });
        }
        break;

      case NotificationType.PAYMENT_CONFIRMED:
        this.mail.sendNotificationMirror({
          email: user.email,
          name: user.name,
          headline: title,
          message: body,
          emoji: "✅",
          dashboardUrl: `${this.frontendUrlFor(Role.DRIVER)}/motorista/recebimentos`,
          ctaLabel: "Ver recebimentos",
          tags: ["payment", "confirmed"],
        });
        break;

      case NotificationType.SESSION_ACCEPTED:
      case NotificationType.SESSION_REJECTED:
        this.mail.sendSessionResponse({
          email: user.email,
          name: user.name,
          accepted: type === NotificationType.SESSION_ACCEPTED,
          conductorName: typeof meta?.conductorName === "string" ? meta.conductorName : undefined,
        });
        break;

      case NotificationType.SESSION_ENDED:
        this.mail.sendSessionEnded({
          email: user.email,
          name: user.name,
          driverName: typeof meta?.driverName === "string" ? meta.driverName : "Motorista",
          vehiclePlate: typeof meta?.vehiclePlate === "string" ? meta.vehiclePlate : "—",
        });
        break;

      case NotificationType.CONDUCTOR_JOINED:
      case NotificationType.CONDUCTOR_LINKED:
      case NotificationType.CONDUCTOR_UNLINKED:
      case NotificationType.CONDUCTOR_WELCOME:
        this.mail.sendNotificationMirror({
          email: user.email,
          name: user.name,
          headline: title,
          message: body,
          emoji: "🎫",
          dashboardUrl: this.frontendUrlFor(user.role),
          ctaLabel: "Abrir painel",
          tags: ["conductor", type.toLowerCase()],
        });
        break;

      case NotificationType.PAYOUT_CONFIRM:
      case NotificationType.PAYOUT_RECEIVED:
      case NotificationType.PAYOUT_COMPLETED:
      case NotificationType.PAYOUT_SCHEDULED:
        this.mail.sendPayoutNotification({
          email: user.email,
          name: user.name,
          headline: title,
          message: body,
          amount,
          role: user.role === Role.CONDUCTOR ? "CONDUCTOR" : "DRIVER",
        });
        break;

      case NotificationType.CONDUCTOR_WITHDRAW_REQUEST:
      case NotificationType.CONDUCTOR_WITHDRAW_DECISION:
        this.mail.sendNotificationMirror({
          email: user.email,
          name: user.name,
          headline: title,
          message: body,
          emoji: "💸",
          details: amount ? [{ label: "Valor", value: `${amount.toLocaleString("pt-AO")} Kz` }] : undefined,
          dashboardUrl:
            user.role === Role.DRIVER
              ? `${this.frontendUrlFor(Role.DRIVER)}/motorista/cobradores`
              : `${this.frontendUrlFor(Role.CONDUCTOR)}/cobrador`,
          ctaLabel: "Ver pedido",
          tags: ["withdraw", user.role.toLowerCase()],
        });
        break;

      case NotificationType.REFUND_REQUEST:
      case NotificationType.REFUND_REJECTED:
      case NotificationType.REFUND_AWAITING_DRIVER:
      case NotificationType.REFUND_APPROVED:
        if (amount) {
          this.mail.sendRefundNotification({
            email: user.email,
            name: user.name,
            headline: title,
            message: body,
            amount,
            paymentReference,
            role: user.role === Role.CONDUCTOR ? "CONDUCTOR" : "DRIVER",
          });
        } else {
          this.mail.sendNotificationMirror({
            email: user.email,
            name: user.name,
            headline: title,
            message: body,
            emoji: "↩️",
            tags: ["refund", user.role.toLowerCase()],
          });
        }
        break;

      default:
        break;
    }
  }

  private frontendUrlFor(role: Role): string {
    const base = process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:5173";
    if (role === Role.CONDUCTOR) return base;
    if (role === Role.DRIVER) return base;
    return base;
  }
}
