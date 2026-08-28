import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationEmailService } from "./notification-email.service";

@Injectable()
export class NotificationPublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: NotificationEmailService,
  ) {}

  async publish(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    meta?: Record<string, unknown>;
    skipEmail?: boolean;
  }) {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        meta: input.meta ? (input.meta as Prisma.InputJsonValue) : undefined,
      },
    });

    if (!input.skipEmail) {
      this.emails.dispatch(input.userId, input.type, input.title, input.body, input.meta);
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
