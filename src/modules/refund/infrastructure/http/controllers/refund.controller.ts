import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { DecideRefundDto, RequestRefundDto } from "../../../application/dto/refund.dto";
import {
  DecideRefundUseCase,
  ListRefundsUseCase,
  RequestRefundUseCase,
} from "../../../application/use-cases/refund.use-cases";

@ApiTags("refunds")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("refunds")
export class RefundController {
  constructor(
    private readonly requestRefund: RequestRefundUseCase,
    private readonly decideRefund: DecideRefundUseCase,
    private readonly listRefunds: ListRefundsUseCase,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Listar reembolsos do utilizador" })
  list(@Req() req: { user: { sub: string; role: Role } }) {
    return this.listRefunds.execute(req.user.sub, req.user.role);
  }

  @Post()
  @ApiOperation({ summary: "Passageiro solicita reembolso" })
  create(@Req() req: { user: { sub: string } }, @Body() dto: RequestRefundDto) {
    return this.requestRefund.execute(req.user.sub, dto);
  }

  @Patch(":id/decision")
  @ApiOperation({ summary: "Cobrador ou motorista decide reembolso" })
  decide(
    @Req() req: { user: { sub: string; role: Role } },
    @Param("id") id: string,
    @Body() dto: DecideRefundDto,
  ) {
    return this.decideRefund.execute(req.user.sub, req.user.role, id, dto);
  }
}
