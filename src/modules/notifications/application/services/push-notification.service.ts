import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush = require("web-push");
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import type { SubscribePushDto } from "../dto/push.dto";

function resolvePushUrl(
  frontendUrl: string,
  type: string,
  meta?: Record<string, unknown> | null,
): string {
  const base = frontendUrl.replace(/\/$/, "");
  const requestId = typeof meta?.requestId === "string" ? meta.requestId : undefined;
  const sessionId = typeof meta?.sessionId === "string" ? meta.sessionId : undefined;

  switch (type) {
    case "TRIP_PAYMENT_REQUEST":
      return requestId ? `${base}/app/pedidos?requestId=${requestId}` : `${base}/app/pedidos`;
    case "SESSION_REQUEST":
      return sessionId ? `${base}/cobrador?sessionId=${sessionId}` : `${base}/cobrador`;
    case "WELCOME_BONUS":
      return `${base}/app`;
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      return `${base}/motorista/recebimentos`;
    default:
      return `${base}/app/notificacoes`;
  }
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly enabled: boolean;
  private readonly frontendUrl: string;
  private readonly publicKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>("FRONTEND_URL") ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );
    const publicKey = config.get<string>("VAPID_PUBLIC_KEY")?.trim();
    const privateKey = config.get<string>("VAPID_PRIVATE_KEY")?.trim();
    const subject = config.get<string>("VAPID_SUBJECT") ?? "mailto:ops@candongueiro.pay";
    this.publicKey = publicKey ?? null;

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.enabled = false;
      this.logger.warn("VAPID keys em falta — push web desactivado");
    }
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async subscribe(userId: string, dto: SubscribePushDto, userAgent?: string) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent,
      },
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { ok: true };
  }

  async sendToUser(
    userId: string,
    input: { title: string; body: string; type: string; meta?: Record<string, unknown> | null },
  ) {
    if (!this.enabled) return;

    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;

    const url = resolvePushUrl(this.frontendUrl, input.type, input.meta);
    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url,
      type: input.type,
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          }
          this.logger.warn(`Push falhou (${sub.id}): ${error instanceof Error ? error.message : error}`);
        }
      }),
    );
  }
}
