import { Module } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY, PrismaNotificationRepository } from "./infrastructure/persistence/prisma-notification.repository";
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from "./application/use-cases/notifications.use-case";
import { NotificationPublisherService } from "./application/services/notification-publisher.service";
import { NotificationsController } from "./infrastructure/http/controllers/notifications.controller";

@Module({
  controllers: [NotificationsController],
  providers: [
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    NotificationPublisherService,
    PrismaNotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
  ],
  exports: [NOTIFICATION_REPOSITORY, NotificationPublisherService],
})
export class NotificationsModule {}
