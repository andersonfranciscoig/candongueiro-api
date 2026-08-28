import { Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from "../../../application/use-cases/notifications.use-case";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
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
}
