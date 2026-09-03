import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { AuthCookieService } from "../../../../../shared/infrastructure/auth/auth-cookie.service";
import {
  CreateWorkSessionDto,
  RespondSessionRequestDto,
  SearchAvailableConductorsDto,
  UpdateWorkSessionDto,
} from "../../../application/dto/work-session.dto";
import {
  CreateWorkSessionUseCase,
  EndWorkSessionUseCase,
  GetActiveWorkSessionUseCase,
  GetWorkSessionUseCase,
  ListAvailableConductorsUseCase,
  ListPendingSessionRequestsUseCase,
  RespondSessionRequestUseCase,
  UpdateWorkSessionUseCase,
} from "../../../application/use-cases/work-session.use-cases";
import {
  GetConductorActivityStatsUseCase,
  GetDriverActivityStatsUseCase,
} from "../../../application/use-cases/activity-stats.use-cases";

@ApiTags("work-sessions")
@Controller("work-sessions")
export class WorkSessionController {
  constructor(
    private readonly createSession: CreateWorkSessionUseCase,
    private readonly getActive: GetActiveWorkSessionUseCase,
    private readonly endSession: EndWorkSessionUseCase,
    private readonly respondRequest: RespondSessionRequestUseCase,
    private readonly listAvailable: ListAvailableConductorsUseCase,
    private readonly listPending: ListPendingSessionRequestsUseCase,
    private readonly getSession: GetWorkSessionUseCase,
    private readonly updateSession: UpdateWorkSessionUseCase,
    private readonly conductorStats: GetConductorActivityStatsUseCase,
    private readonly driverStats: GetDriverActivityStatsUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Abrir turno do dia" })
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreateWorkSessionDto) {
    return this.createSession.execute(req.user.sub, dto);
  }

  @Get("active")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Turno activo do utilizador" })
  active(@Req() req: { user: { sub: string; role: Role } }) {
    return this.getActive.execute(req.user.sub, req.user.role);
  }

  @Get("stats/conductor")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Métricas de actividade do cobrador" })
  conductorActivity(@Req() req: { user: { sub: string } }) {
    return this.conductorStats.execute(req.user.sub);
  }

  @Get("stats/driver")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Métricas de actividade do motorista" })
  driverActivity(@Req() req: { user: { sub: string } }) {
    return this.driverStats.execute(req.user.sub);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Detalhes de um turno" })
  getOne(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.getSession.execute(req.user.sub, id);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Actualizar turno activo" })
  update(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() dto: UpdateWorkSessionDto,
  ) {
    return this.updateSession.execute(req.user.sub, id, dto);
  }

  @Patch(":id/end")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Encerrar turno" })
  end(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.endSession.execute(req.user.sub, id);
  }

  @Post("conductors/search")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Procurar cobradores disponíveis" })
  searchConductors(
    @Req() req: { user: { sub: string } },
    @Body() dto: SearchAvailableConductorsDto,
  ) {
    return this.listAvailable.execute(req.user.sub, dto);
  }

  @Get("conductor/requests")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Pedidos de turno pendentes (cobrador)" })
  pending(@Req() req: { user: { sub: string } }) {
    return this.listPending.execute(req.user.sub);
  }

  @Patch(":id/respond")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cobrador aceita ou recusa turno" })
  respond(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() dto: RespondSessionRequestDto,
  ) {
    return this.respondRequest.execute(req.user.sub, id, dto.decision);
  }
}
