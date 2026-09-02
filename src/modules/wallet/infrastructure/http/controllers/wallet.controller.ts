import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../../../shared/infrastructure/auth/jwt-auth.guard";
import {
  ConfirmTopUpDto,
  CreateTopUpRequestDto,
  CreateTripPaymentRequestDto,
  LookupTripPaymentRequestsDto,
  PayTripDto,
  PayTripPaymentRequestDto,
  WalletMetricsQueryDto,
  WithdrawDto,
} from "../../../application/dto/wallet.dto";
import { ConfirmTopUpUseCase } from "../../../application/use-cases/confirm-topup.use-case";
import { CreateTopUpRequestUseCase } from "../../../application/use-cases/create-topup-request.use-case";
import { GetWalletMetricsUseCase } from "../../../application/use-cases/get-wallet-metrics.use-case";
import { GetWalletUseCase } from "../../../application/use-cases/get-wallet.use-case";
import { PayTripUseCase } from "../../../application/use-cases/pay-trip.use-case";
import {
  CreateTripPaymentRequestUseCase,
  ListMyTripPaymentRequestsUseCase,
  LookupTripPaymentRequestsUseCase,
  PayTripPaymentRequestUseCase,
  RejectTripPaymentRequestUseCase,
} from "../../../application/use-cases/trip-payment-request.use-cases";
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
    private readonly createTripPaymentRequest: CreateTripPaymentRequestUseCase,
    private readonly lookupTripPaymentRequests: LookupTripPaymentRequestsUseCase,
    private readonly listMyTripPaymentRequests: ListMyTripPaymentRequestsUseCase,
    private readonly payTripPaymentRequest: PayTripPaymentRequestUseCase,
    private readonly rejectTripPaymentRequest: RejectTripPaymentRequestUseCase,
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

  @Post("trip-requests")
  @ApiOperation({ summary: "Motorista/cobrador envia pedido de pagamento ao passageiro" })
  createTripRequest(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateTripPaymentRequestDto,
  ) {
    return this.createTripPaymentRequest.execute(req.user.sub, dto);
  }

  @Post("trip-requests/lookup")
  @ApiOperation({ summary: "Passageiro procura pedidos pelo telefone ou email" })
  lookupTripRequests(
    @Req() req: { user: { sub: string } },
    @Body() dto: LookupTripPaymentRequestsDto,
  ) {
    return this.lookupTripPaymentRequests.execute(req.user.sub, dto);
  }

  @Get("trip-requests/me")
  @ApiOperation({ summary: "Pedidos pendentes associados à conta autenticada" })
  myTripRequests(@Req() req: { user: { sub: string } }) {
    return this.listMyTripPaymentRequests.execute(req.user.sub);
  }

  @Post("trip-requests/:id/reject")
  @ApiOperation({ summary: "Passageiro recusa pedido de pagamento" })
  rejectTripRequest(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.rejectTripPaymentRequest.execute(req.user.sub, id);
  }

  @Post("trip-requests/:id/pay")
  @ApiOperation({ summary: "Passageiro paga um pedido enviado pelo motorista" })
  payTripRequest(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() dto: PayTripPaymentRequestDto,
  ) {
    return this.payTripPaymentRequest.execute(req.user.sub, id, dto);
  }

  @Post("withdraw")
  @ApiOperation({ summary: "Levantamento (Express ou IBAN)" })
  withdrawFunds(@Req() req: { user: { sub: string } }, @Body() dto: WithdrawDto) {
    return this.withdraw.execute(req.user.sub, dto);
  }
}
