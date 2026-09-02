import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import {
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from "../../../application/use-cases/notifications.use-case";
import { PushNotificationService } from "../../../application/services/push-notification.service";
import { SubscribePushDto, UnsubscribePushDto } from "../../../application/dto/push.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase,
    private readonly push: PushNotificationService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Listar notificações do utilizador" })
  list(@Req() req: { user: { sub: string } }) {
    return this.listNotifications.execute(req.user.sub);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marcar notificação como lida" })
  read(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.markRead.execute(req.user.sub, id);
  }

  @Post("read-all")
  @ApiOperation({ summary: "Marcar todas as notificações como lidas" })
  readAll(@Req() req: { user: { sub: string } }) {
    return this.markAllRead.execute(req.user.sub);
  }

  @Get("push/vapid-public-key")
  @ApiOperation({ summary: "Chave pública VAPID para push web" })
  vapidPublicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  @Post("push/subscribe")
  @ApiOperation({ summary: "Subscrever push web" })
  subscribe(
    @Req() req: { user: { sub: string }; headers: Record<string, string | string[] | undefined> },
    @Body() dto: SubscribePushDto,
  ) {
    const ua = req.headers["user-agent"];
    return this.push.subscribe(req.user.sub, dto, typeof ua === "string" ? ua : undefined);
  }

  @Post("push/unsubscribe")
  @ApiOperation({ summary: "Cancelar subscrição push web" })
  unsubscribe(@Req() req: { user: { sub: string } }, @Body() dto: UnsubscribePushDto) {
    return this.push.unsubscribe(req.user.sub, dto.endpoint);
  }
}
