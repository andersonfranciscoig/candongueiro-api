import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Min, MinLength } from "class-validator";

export class CreateWorkSessionDto {
  @ApiProperty()
  @IsString()
  vehicleId!: string;

  @ApiPropertyOptional({ description: "Telefone do motorista efectivo (default: próprio)" })
  @IsOptional()
  @IsString()
  effectiveDriverPhone?: string;

  @ApiProperty({ example: "2026-08-28T05:00:00.000Z" })
  @IsDateString()
  scheduledStart!: string;

  @ApiProperty({ example: "2026-08-28T22:00:00.000Z" })
  @IsDateString()
  scheduledEnd!: string;

  @ApiPropertyOptional({ description: "ID do cobrador fixo ou disponível" })
  @IsOptional()
  @IsString()
  conductorId?: string;

  @ApiPropertyOptional({ enum: ["NONE", "DAILY", "FULL"] })
  @IsOptional()
  @IsString()
  financialAccess?: "NONE" | "DAILY" | "FULL";

  @ApiPropertyOptional({ description: "Trabalhar sem cobrador" })
  @IsOptional()
  @IsBoolean()
  solo?: boolean;
}

export class SearchAvailableConductorsDto {
  @ApiProperty()
  @IsDateString()
  scheduledStart!: string;

  @ApiProperty()
  @IsDateString()
  scheduledEnd!: string;

  @ApiPropertyOptional({ default: "Luanda" })
  @IsOptional()
  @IsString()
  city?: string;
}

export class RespondSessionRequestDto {
  @ApiProperty({ enum: ["ACCEPTED", "REJECTED"] })
  @IsString()
  decision!: "ACCEPTED" | "REJECTED";
}

export class UpdateWorkSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiPropertyOptional({ enum: ["NONE", "DAILY", "FULL"] })
  @IsOptional()
  @IsString()
  financialAccess?: "NONE" | "DAILY" | "FULL";

  @ApiPropertyOptional({ description: "Novo cobrador (reenvia convite)" })
  @IsOptional()
  @IsString()
  conductorId?: string;

  @ApiPropertyOptional({ description: "Remover cobrador e trabalhar sozinho" })
  @IsOptional()
  @IsBoolean()
  solo?: boolean;

  @ApiPropertyOptional({ description: "Telefone do motorista efectivo" })
  @IsOptional()
  @IsString()
  effectiveDriverPhone?: string;
}

export class AddFixedConductorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductorPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductorId?: string;

  @ApiPropertyOptional({ enum: ["NONE", "DAILY", "FULL"] })
  @IsOptional()
  @IsString()
  financialAccess?: "NONE" | "DAILY" | "FULL";

  @ApiPropertyOptional({ enum: ["MANUAL", "DAILY", "WEEKLY", "MONTHLY"] })
  @IsOptional()
  @IsString()
  payoutSchedule?: "MANUAL" | "DAILY" | "WEEKLY" | "MONTHLY";
}

export class RegisterConductorStandaloneDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(9)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  pin!: string;

  @ApiPropertyOptional({ default: "Luanda" })
  @IsOptional()
  @IsString()
  city?: string;
}

export class SetAvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;
}

export class CreatePayoutDto {
  @ApiProperty()
  @IsString()
  conductorId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ConfirmPayoutDto {
  @ApiProperty({ enum: ["DRIVER", "CONDUCTOR"] })
  @IsEnum(["DRIVER", "CONDUCTOR"] as const)
  role!: "DRIVER" | "CONDUCTOR";

  @ApiPropertyOptional({ description: "Valor final (pagamentos automáticos)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: "Código secreto (obrigatório quando o motorista confirma o pagamento)" })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  pin?: string;
}
