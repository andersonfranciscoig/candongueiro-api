import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import { UpdateProfileDto } from "../../../application/dto/profile.dto";
import { ChangePinDto } from "../../../application/dto/auth.dto";
import { GetProfileUseCase, UpdateProfileUseCase } from "../../../application/use-cases/profile.use-case";
import {
  ChangePinUseCase,
  RequestPinChangeOtpUseCase,
} from "../../../application/use-cases/change-pin.use-case";

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly requestPinChangeOtp: RequestPinChangeOtpUseCase,
    private readonly changePin: ChangePinUseCase,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Dados do utilizador autenticado" })
  me(@Req() req: { user: { sub: string } }) {
    return this.getProfile.execute(req.user.sub);
  }

  @Patch("me")
  @ApiOperation({ summary: "Actualizar nome ou telefone" })
  update(@Req() req: { user: { sub: string } }, @Body() dto: UpdateProfileDto) {
    return this.updateProfile.execute(req.user.sub, dto);
  }

  @Patch("pin/request-otp")
  @ApiOperation({ summary: "Pedir código por email para alterar PIN" })
  requestPinOtp(@Req() req: { user: { sub: string } }) {
    return this.requestPinChangeOtp.execute(req.user.sub);
  }

  @Patch("pin")
  @ApiOperation({ summary: "Alterar PIN (requer OTP + PIN actual)" })
  updatePin(@Req() req: { user: { sub: string } }, @Body() dto: ChangePinDto) {
    return this.changePin.execute(req.user.sub, dto);
  }
}
