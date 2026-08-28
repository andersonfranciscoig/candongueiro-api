import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches, MinLength } from "class-validator";
import { WithdrawMethod } from "../../../../shared/domain/types/enums";

export class WalletMetricsQueryDto {
  @ApiProperty({ enum: ["day", "month", "year", "custom"] })
  @IsEnum(["day", "month", "year", "custom"] as const)
  period!: "day" | "month" | "year" | "custom";

  @ApiPropertyOptional({ example: "2026-08-28", description: "YYYY-MM-DD — obrigatório com period=custom" })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreateTopUpRequestDto {
  @ApiProperty({ example: 5000 })
  @IsInt()
  @IsPositive()
  amount!: number;
}

export class ConfirmTopUpDto {
  @ApiProperty({ description: "Referência Express gerada no pedido de carregamento" })
  @IsString()
  @MinLength(4)
  reference!: string;
}

export class PayTripDto {
  @ApiProperty({ example: 500 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: "QR Code lido no candongueiro" })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional({ description: "Matrícula (alternativa ao QR)" })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiProperty({ example: "123456", description: "Código secreto para confirmar pagamento" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "O código secreto deve ter 6 dígitos." })
  pin!: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 3000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: WithdrawMethod })
  @IsEnum(WithdrawMethod)
  method!: WithdrawMethod;

  @ApiPropertyOptional({ description: "Telefone Multicaixa Express (ref = telefone)" })
  @IsOptional()
  @IsString()
  expressPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;
}
