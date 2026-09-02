import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class PushKeysDto {
  @ApiProperty()
  @IsString()
  p256dh!: string;

  @ApiProperty()
  @IsString()
  auth!: string;
}

export class SubscribePushDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  endpoint!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UnsubscribePushDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  endpoint!: string;
}
