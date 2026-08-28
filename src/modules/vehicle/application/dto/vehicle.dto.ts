import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

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
  @ApiProperty({ example: "CPAY:VEH:LD-45-23-AB" })
  @IsString()
  @MinLength(8)
  qrCode!: string;
}
