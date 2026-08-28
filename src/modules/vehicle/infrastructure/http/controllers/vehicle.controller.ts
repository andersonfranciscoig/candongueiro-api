import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { RegisterVehicleDto, ScanVehicleDto } from "../../../application/dto/vehicle.dto";
import { GetMyVehiclesUseCase } from "../../../application/use-cases/get-my-vehicles.use-case";
import { RegisterVehicleUseCase } from "../../../application/use-cases/register-vehicle.use-case";
import { ScanVehicleUseCase } from "../../../application/use-cases/scan-vehicle.use-case";

@ApiTags("vehicles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vehicles")
export class VehicleController {
  constructor(
    private readonly getMyVehicles: GetMyVehiclesUseCase,
    private readonly registerVehicle: RegisterVehicleUseCase,
    private readonly scanVehicle: ScanVehicleUseCase,
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
  @ApiOperation({ summary: "Ler QR Code de candongueiro" })
  scan(@Body() dto: ScanVehicleDto) {
    return this.scanVehicle.execute(dto);
  }
}
