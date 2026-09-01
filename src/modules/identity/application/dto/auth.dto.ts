import { Role } from "../../../../shared/domain/types/enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class RequestOtpDto {
  @ApiProperty({ example: "anderson@email.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "+244 923 000 000" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ["register", "login"] })
  @IsEnum(["register", "login"] as const)
  flow!: "register" | "login";

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginWithPinDto {
  @ApiProperty({ example: "+244 923 000 000" })
  @IsString()
  @MinLength(9)
  phone!: string;

  @ApiProperty({ example: "123456", description: "Código secreto de 6 dígitos" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "O código secreto deve ter 6 dígitos." })
  pin!: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(6)
  code!: string;

  @ApiProperty({ enum: ["register", "login"] })
  @IsEnum(["register", "login"] as const)
  flow!: "register" | "login";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: "123456", description: "Código secreto (obrigatório no registo)" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: "O código secreto deve ter 6 dígitos." })
  pin?: string;
}

export class ChangePinDto {
  @ApiProperty({ example: "123456", description: "Código enviado por email" })
  @IsString()
  @MinLength(6)
  code!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Matches(/^\d{6}$/)
  currentPin!: string;

  @ApiProperty({ example: "654321" })
  @IsString()
  @Matches(/^\d{6}$/)
  newPin!: string;
}

export class RequestRecoverOtpDto {
  @ApiProperty({ example: "anderson@email.com" })
  @IsEmail()
  email!: string;
}

export class RecoverPinDto {
  @ApiProperty({ example: "anderson@email.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "123456", description: "Código enviado por email" })
  @IsString()
  @MinLength(6)
  code!: string;

  @ApiProperty({ example: "654321", description: "Novo código secreto de 6 dígitos" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "O código secreto deve ter 6 dígitos." })
  newPin!: string;
}
