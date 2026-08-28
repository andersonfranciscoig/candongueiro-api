import { Injectable } from "@nestjs/common";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationRepository {
  listForUser(userId: string, limit?: number): Promise<NotificationRecord[]>;
  markRead(userId: string, notificationId: string): Promise<NotificationRecord>;
  markAllRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
}

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: Date | null;
    meta: unknown;
    createdAt: Date;
  }): NotificationRecord {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      readAt: row.readAt,
      meta: (row.meta as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    };
  }

  async listForUser(userId: string, limit = 30) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => this.map(row));
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) throw new NotFoundException("Notificação");

    const row = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return this.map(row);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }
}
