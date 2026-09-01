import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { RegisterVehicleDto, ScanVehicleDto, UpdateVehicleStatusDto } from "../../../application/dto/vehicle.dto";
import { GetMyVehiclesUseCase } from "../../../application/use-cases/get-my-vehicles.use-case";
import { RegisterVehicleUseCase } from "../../../application/use-cases/register-vehicle.use-case";
import { ScanVehicleUseCase } from "../../../application/use-cases/scan-vehicle.use-case";
import { UpdateVehicleStatusUseCase } from "../../../application/use-cases/update-vehicle-status.use-case";

@ApiTags("vehicles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vehicles")
export class VehicleController {
  constructor(
    private readonly getMyVehicles: GetMyVehiclesUseCase,
    private readonly registerVehicle: RegisterVehicleUseCase,
    private readonly scanVehicle: ScanVehicleUseCase,
    private readonly updateVehicleStatus: UpdateVehicleStatusUseCase,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Veículos do motorista autenticado" })
  mine(@Req() req: { user: { sub: string } }) {
    return this.getMyVehicles.execute(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: "Registar veículo (motorista)" })
  register(@Req() req: { user: { sub: string } }, @Body() dto: RegisterVehicleDto) {
    return this.registerVehicle.execute(req.user.sub, dto);
  }

  @Post("scan")
  @ApiOperation({ summary: "Ler QR Code ou matrícula de candongueiro" })
  scan(@Body() dto: ScanVehicleDto) {
    return this.scanVehicle.execute(dto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Activar ou desactivar veículo" })
  updateStatus(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() dto: UpdateVehicleStatusDto,
  ) {
    return this.updateVehicleStatus.execute(req.user.sub, id, dto);
  }
}
