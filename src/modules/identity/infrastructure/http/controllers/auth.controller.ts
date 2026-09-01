import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AuthCookieService } from "../../../../../shared/infrastructure/auth/auth-cookie.service";
import { LoginWithPinDto, RecoverPinDto, RequestOtpDto, RequestRecoverOtpDto, VerifyOtpDto } from "../../../application/dto/auth.dto";
import { LoginWithPinUseCase } from "../../../application/use-cases/login-with-pin.use-case";
import { RequestOtpUseCase } from "../../../application/use-cases/request-otp.use-case";
import { VerifyOtpUseCase } from "../../../application/use-cases/verify-otp.use-case";
import {
  RecoverPinUseCase,
  RequestRecoverOtpUseCase,
} from "../../../application/use-cases/recover-pin.use-case";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly requestOtp: RequestOtpUseCase,
    private readonly verifyOtp: VerifyOtpUseCase,
    private readonly loginWithPin: LoginWithPinUseCase,
    private readonly requestRecoverOtp: RequestRecoverOtpUseCase,
    private readonly recoverPinUseCase: RecoverPinUseCase,
    private readonly authCookies: AuthCookieService,
  ) {}

  @Post("otp/request")
  @ApiOperation({ summary: "Pedir OTP por email (registo ou recuperação)" })
  request(@Body() dto: RequestOtpDto) {
    return this.requestOtp.execute(dto);
  }

  @Post("otp/verify")
  @ApiCookieAuth("cpay_session")
  @ApiOperation({ summary: "Verificar OTP e criar sessão (registo)" })
  async verify(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.verifyOtp.execute(dto);
    this.authCookies.setSession(res, result.accessToken);
    return { user: result.user, accessToken: result.accessToken, welcomeBonus: result.welcomeBonus ?? undefined };
  }

  @Post("login")
  @ApiCookieAuth("cpay_session")
  @ApiOperation({ summary: "Entrar com telefone e código secreto" })
  async login(@Body() dto: LoginWithPinDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.loginWithPin.execute(dto);
    this.authCookies.setSession(res, result.accessToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post("logout")
  @ApiOperation({ summary: "Terminar sessão (limpa cookie)" })
  logout(@Res({ passthrough: true }) res: Response) {
    this.authCookies.clearSession(res);
    return { ok: true };
  }

  @Post("recover/request")
  @ApiOperation({ summary: "Pedir código de recuperação por email" })
  recoverRequest(@Body() dto: RequestRecoverOtpDto) {
    return this.requestRecoverOtp.execute(dto);
  }

  @Post("recover/pin")
  @ApiOperation({ summary: "Definir novo código secreto com código do email" })
  recoverPin(@Body() dto: RecoverPinDto) {
    return this.recoverPinUseCase.execute(dto);
  }
}
