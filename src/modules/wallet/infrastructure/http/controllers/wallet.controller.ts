import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import {
  ConfirmTopUpDto,
  CreateTopUpRequestDto,
  PayTripDto,
  WalletMetricsQueryDto,
  WithdrawDto,
} from "../../../application/dto/wallet.dto";
import { ConfirmTopUpUseCase } from "../../../application/use-cases/confirm-topup.use-case";
import { CreateTopUpRequestUseCase } from "../../../application/use-cases/create-topup-request.use-case";
import { GetWalletMetricsUseCase } from "../../../application/use-cases/get-wallet-metrics.use-case";
import { GetWalletUseCase } from "../../../application/use-cases/get-wallet.use-case";
import { PayTripUseCase } from "../../../application/use-cases/pay-trip.use-case";
import { WithdrawUseCase } from "../../../application/use-cases/withdraw.use-case";

@ApiTags("wallet")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly getWallet: GetWalletUseCase,
    private readonly getWalletMetrics: GetWalletMetricsUseCase,
    private readonly createTopUpRequest: CreateTopUpRequestUseCase,
    private readonly confirmTopUp: ConfirmTopUpUseCase,
    private readonly payTrip: PayTripUseCase,
    private readonly withdraw: WithdrawUseCase,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Saldo e movimentos recentes" })
  me(@Req() req: { user: { sub: string } }) {
    return this.getWallet.execute(req.user.sub);
  }

  @Get("metrics")
  @ApiOperation({ summary: "Métricas de gastos (passageiro) ou recebimentos (motorista)" })
  metrics(@Req() req: { user: { sub: string } }, @Query() query: WalletMetricsQueryDto) {
    return this.getWalletMetrics.execute(req.user.sub, query);
  }

  @Post("topup/request")
  @ApiOperation({ summary: "Criar pedido de carregamento Express (entidade 0407)" })
  topUpRequest(@Req() req: { user: { sub: string } }, @Body() dto: CreateTopUpRequestDto) {
    return this.createTopUpRequest.execute(req.user.sub, dto);
  }

  @Post("topup/confirm")
  @ApiOperation({ summary: "Confirmar carregamento (mock dev — simula pagamento Express)" })
  topUpConfirm(@Req() req: { user: { sub: string } }, @Body() dto: ConfirmTopUpDto) {
    return this.confirmTopUp.execute(req.user.sub, dto);
  }

  @Post("pay")
  @ApiOperation({ summary: "Pagar viagem a um candongueiro" })
  pay(@Req() req: { user: { sub: string } }, @Body() dto: PayTripDto) {
    return this.payTrip.execute(req.user.sub, dto);
  }

  @Post("withdraw")
  @ApiOperation({ summary: "Levantamento (Express ou IBAN)" })
  withdrawFunds(@Req() req: { user: { sub: string } }, @Body() dto: WithdrawDto) {
    return this.withdraw.execute(req.user.sub, dto);
  }
}
