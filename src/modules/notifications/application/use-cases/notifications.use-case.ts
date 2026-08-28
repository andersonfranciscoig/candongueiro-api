import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../infrastructure/persistence/prisma-notification.repository";

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
  ) {}

  async execute(userId: string) {
    const items = await this.notifications.listForUser(userId);
    const unreadCount = await this.notifications.countUnread(userId);

    return {
      unreadCount,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        read: item.readAt !== null,
        meta: item.meta,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
  ) {}

  async execute(userId: string, notificationId: string) {
    const item = await this.notifications.markRead(userId, notificationId);
    return {
      id: item.id,
      read: item.readAt !== null,
      readAt: item.readAt?.toISOString() ?? null,
    };
  }
}
