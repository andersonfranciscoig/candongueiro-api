import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class SwitchRoleDto {
  @ApiProperty({ enum: [Role.PASSENGER, Role.DRIVER, Role.CONDUCTOR] })
  @IsEnum(Role)
  role!: Role;
}
