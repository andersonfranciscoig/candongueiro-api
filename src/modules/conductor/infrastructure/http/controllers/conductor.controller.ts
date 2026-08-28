import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { AuthCookieService } from "../../../../../shared/infrastructure/auth/auth-cookie.service";
import {
  CheckConductorInviteDto,
  ConfirmPaymentDto,
  ConductorWithdrawRequestDto,
  DecideConductorWithdrawDto,
  InviteConductorDto,
  RegisterConductorDto,
} from "../../../application/dto/conductor.dto";
import {
  CheckConductorInviteUseCase,
  ConfirmPaymentUseCase,
  DecideConductorWithdrawUseCase,
  GetConductorDashboardUseCase,
  InviteConductorUseCase,
  RegisterConductorUseCase,
  RequestConductorWithdrawUseCase,
} from "../../../application/use-cases/conductor.use-cases";
import {
  AddFixedConductorUseCase,
  ConfirmConductorPayoutUseCase,
  CreateConductorPayoutUseCase,
  DeactivateConductorRelationUseCase,
  ListConductorPayoutsUseCase,
  ListDriverConductorsV2UseCase,
  RegisterConductorStandaloneUseCase,
  SetConductorAvailabilityUseCase,
  TriggerScheduledPayoutsUseCase,
} from "../../../application/use-cases/conductor-v2.use-cases";
import {
  AddFixedConductorDto,
  ConfirmPayoutDto,
  CreatePayoutDto,
  RegisterConductorStandaloneDto,
  SetAvailabilityDto,
} from "../../../../work-session/application/dto/work-session.dto";

@ApiTags("conductors")
@Controller("conductors")
export class ConductorController {
  constructor(
    private readonly inviteConductor: InviteConductorUseCase,
    private readonly checkInvite: CheckConductorInviteUseCase,
    private readonly registerConductor: RegisterConductorUseCase,
    private readonly registerStandalone: RegisterConductorStandaloneUseCase,
    private readonly setAvailability: SetConductorAvailabilityUseCase,
    private readonly addFixed: AddFixedConductorUseCase,
    private readonly deactivateRelation: DeactivateConductorRelationUseCase,
    private readonly listConductorsV2: ListDriverConductorsV2UseCase,
    private readonly createPayout: CreateConductorPayoutUseCase,
    private readonly confirmPayout: ConfirmConductorPayoutUseCase,
    private readonly listPayouts: ListConductorPayoutsUseCase,
    private readonly triggerScheduledPayouts: TriggerScheduledPayoutsUseCase,
    private readonly getDashboard: GetConductorDashboardUseCase,
    private readonly confirmPayment: ConfirmPaymentUseCase,
    private readonly requestWithdraw: RequestConductorWithdrawUseCase,
    private readonly decideWithdraw: DecideConductorWithdrawUseCase,
    private readonly authCookies: AuthCookieService,
  ) {}

  @Post("signup")
  @ApiCookieAuth("cpay_session")
  @ApiOperation({ summary: "Registo independente de cobrador" })
  async signup(
    @Body() dto: RegisterConductorStandaloneDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registerStandalone.execute(dto);
    this.authCookies.setSession(res, result.accessToken);
    return { user: result.user };
  }

  @Post("invite/check")
  @ApiOperation({ summary: "Verificar convite de cobrador (token ou telefone)" })
  check(@Body() dto: CheckConductorInviteDto) {
    return this.checkInvite.execute(dto);
  }

  @Post("register")
  @ApiCookieAuth("cpay_session")
  @ApiOperation({ summary: "Registar cobrador a partir de convite" })
  async register(@Body() dto: RegisterConductorDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.registerConductor.execute(dto);
    this.authCookies.setSession(res, result.accessToken);
    return { user: result.user };
  }

  @Post("invite")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista convida cobrador" })
  invite(@Req() req: { user: { sub: string } }, @Body() dto: InviteConductorDto) {
    return this.inviteConductor.execute(req.user.sub, dto);
  }

  @Patch("me/availability")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cobrador define disponibilidade" })
  availability(@Req() req: { user: { sub: string } }, @Body() dto: SetAvailabilityDto) {
    return this.setAvailability.execute(req.user.sub, dto);
  }

  @Post("relations")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista adiciona cobrador fixo" })
  addRelation(@Req() req: { user: { sub: string } }, @Body() dto: AddFixedConductorDto) {
    return this.addFixed.execute(req.user.sub, dto);
  }

  @Delete("relations/:conductorId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista desactiva cobrador fixo" })
  removeRelation(
    @Req() req: { user: { sub: string } },
    @Param("conductorId") conductorId: string,
  ) {
    return this.deactivateRelation.execute(req.user.sub, conductorId);
  }

  @Get("team")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista lista cobradores fixos" })
  team(@Req() req: { user: { sub: string } }) {
    return this.listConductorsV2.execute(req.user.sub);
  }

  @Post("payouts")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista inicia pagamento ao cobrador" })
  payout(@Req() req: { user: { sub: string } }, @Body() dto: CreatePayoutDto) {
    return this.createPayout.execute(req.user.sub, dto);
  }

  @Get("payouts/me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Listar pagamentos motorista/cobrador" })
  myPayouts(@Req() req: { user: { sub: string; role: Role } }) {
    return this.listPayouts.execute(req.user.sub, req.user.role);
  }

  @Patch("payouts/:id/confirm")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Confirmar pagamento (motorista ou cobrador)" })
  confirmPayoutRoute(
    @Req() req: { user: { sub: string; role: Role } },
    @Param("id") id: string,
    @Body() dto: ConfirmPayoutDto,
  ) {
    return this.confirmPayout.execute(req.user.sub, req.user.role, id, dto);
  }

  @Post("payouts/trigger-scheduled")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Disparar pagamentos automáticos pendentes (cron/admin)" })
  triggerScheduled() {
    return this.triggerScheduledPayouts.execute();
  }

  @Get("me/dashboard")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Painel do cobrador" })
  dashboard(@Req() req: { user: { sub: string } }) {
    return this.getDashboard.execute(req.user.sub);
  }

  @Post("me/payments/confirm")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cobrador confirma pagamento de passageiro" })
  confirm(@Req() req: { user: { sub: string } }, @Body() dto: ConfirmPaymentDto) {
    return this.confirmPayment.execute(req.user.sub, dto.reference);
  }

  @Post("me/withdraw-request")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cobrador solicita levantamento" })
  withdrawRequest(
    @Req() req: { user: { sub: string } },
    @Body() dto: ConductorWithdrawRequestDto,
  ) {
    return this.requestWithdraw.execute(req.user.sub, dto.amount);
  }

  @Patch("withdraw-requests/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Motorista aprova/rejeita levantamento do cobrador" })
  decideWithdrawRequest(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() dto: DecideConductorWithdrawDto,
  ) {
    return this.decideWithdraw.execute(req.user.sub, id, dto.decision);
  }
}
