import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class RegisterVehicleDto {
  @ApiProperty({ example: "LD-45-23-AB" })
  @IsString()
  @MinLength(6)
  plate!: string;

  @ApiPropertyOptional({ example: "Toyota Hiace" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: "Nome do condutor (default: nome do utilizador)" })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({ description: "Indica se é proprietário (default true)" })
  @IsOptional()
  @IsBoolean()
  isOwner?: boolean;
}

export class ScanVehicleDto {
  @ApiPropertyOptional({ example: "CPAY:VEH:LD-45-23-AB" })
  @ValidateIf((dto: ScanVehicleDto) => !dto.plate)
  @IsString()
  @MinLength(8)
  qrCode?: string;

  @ApiPropertyOptional({ example: "LD-45-23-AB", description: "Código/matrícula do candongueiro" })
  @ValidateIf((dto: ScanVehicleDto) => !dto.qrCode)
  @IsString()
  @MinLength(4)
  plate?: string;
}

export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  @IsEnum(["ACTIVE", "INACTIVE"] as const)
  status!: "ACTIVE" | "INACTIVE";
}
