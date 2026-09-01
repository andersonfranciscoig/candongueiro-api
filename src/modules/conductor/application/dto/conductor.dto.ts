import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";

export class InviteConductorDto {
  @ApiPropertyOptional({ example: "cobrador@email.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "923456789" })
  @IsOptional()
  @IsString()
  @MinLength(9)
  phone?: string;
}

export class RegisterConductorDto {
  @ApiPropertyOptional({ description: "Token do convite por email" })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ description: "Telefone quando convidado por número" })
  @IsOptional()
  @IsString()
  @MinLength(9)
  phone?: string;

  @ApiProperty({ example: "João Cobrador" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  pin!: string;
}

export class CheckConductorInviteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(9)
  phone?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: "Referência do pagamento (ledger)" })
  @IsString()
  reference!: string;
}

export class ConductorWithdrawRequestDto {
  @ApiProperty({ example: 5000 })
  amount!: number;
}

export class DecideConductorWithdrawDto {
  @ApiProperty({ enum: ["APPROVED", "REJECTED"] })
  @IsString()
  decision!: "APPROVED" | "REJECTED";
}

export class DiscoverConductorsDto {
  @ApiPropertyOptional({ description: "Filtrar por nome ou telefone" })
  @IsOptional()
  @IsString()
  q?: string;
}
