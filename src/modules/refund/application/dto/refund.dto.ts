import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class RequestRefundDto {
  @ApiProperty({ description: "Referência do pagamento original" })
  @IsString()
  paymentReference!: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecideRefundDto {
  @ApiProperty({ enum: ["APPROVED", "REJECTED"] })
  @IsString()
  decision!: "APPROVED" | "REJECTED";
}
