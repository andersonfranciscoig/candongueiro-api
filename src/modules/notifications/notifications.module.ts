import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { NOTIFICATION_REPOSITORY, PrismaNotificationRepository } from "./infrastructure/persistence/prisma-notification.repository";
import {
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from "./application/use-cases/notifications.use-case";
import { NotificationPublisherService } from "./application/services/notification-publisher.service";
import { NotificationEmailService } from "./application/services/notification-email.service";
import { PushNotificationService } from "./application/services/push-notification.service";
import { NotificationsController } from "./infrastructure/http/controllers/notifications.controller";

@Module({
  imports: [MailModule],
  controllers: [NotificationsController],
  providers: [
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    NotificationPublisherService,
    NotificationEmailService,
    PushNotificationService,
    PrismaNotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
  ],
  exports: [NOTIFICATION_REPOSITORY, NotificationPublisherService, PushNotificationService],
})
export class NotificationsModule {}
